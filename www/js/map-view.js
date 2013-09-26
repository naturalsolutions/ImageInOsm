/*
 * Copyright 2013 Natural Solutions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var ImageInOsm = (function(app) {
    "use strict";

    app.Views.Map = Backbone.Layout.extend({
        template: "#osm-selector-page",

        mapObject: null,
        dataLayer: null,
        selectedFeature: null,
        selector: null,

        events: {
            'click #capture-button': 'onCamera',
            'click #gallery-button': 'onGallery'
        },

        createMap: function() {
            // Create map once
            if (this.mapObject !== null)
                return this.mapObject;

            this.$map = this.$el.find('.osm-selector');
            // Ensure the map div has a size. FIXME: crappy code, should not be necessary (sizing/positionning is normally controlled by CSS...)
            var mapSize;
            if ('mapSize' in app.global)
                mapSize = app.global.mapSize;
            else
                mapSize = {width: '800px', height: '300px'};
            this.$map.css(mapSize);

            // Initialize map with baselayer, projection, center, etc...
            var mapOptions = {
                projection: new OpenLayers.Projection('EPSG:3857'),
                displayProjection: new OpenLayers.Projection('EPSG:4326'),
                theme: null,
                renderers: ['Canvas', 'SVG'],
                controls: [
                    new OpenLayers.Control.Attribution(),
                    new OpenLayers.Control.TouchNavigation(),
                    new OpenLayers.Control.Zoom()
                ],
                layers: []
            };
            mapOptions.layers.push(new OpenLayers.Layer.OSM('Fond de plan', app.global.basemapUrl, _.extend({transitionEffect: 'resize'}, app.global.basemapOptions)));
            this.mapObject = new OpenLayers.Map(this.$map[0], mapOptions);
            var coords = app.models.pos.get('coords');
            if (coords) {
                // Zoom to a focus point if any
                this.mapObject.setCenter(
                    (new OpenLayers.LonLat([coords.longitude, coords.latitude])).transform(mapOptions.displayProjection, mapOptions.projection),
                    18
                );
            } else {
                // Zoom to a wide extent otherwise
                var ext = app.global.mapExtent,
                    bounds = new OpenLayers.Bounds([ext.minx, ext.miny, ext.maxx, ext.maxy]);
                this.mapObject.zoomToExtent(bounds.transform(mapOptions.displayProjection, mapOptions.projection));
            }

            // Add vector data layer
            this.dataLayer = new OpenLayers.Layer.Vector('Données', {
                strategies: [new OpenLayers.Strategy.Fixed()],
                projection: 'EPSG:4326',
                protocol: new OpenLayers.Protocol.HTTP({
                    format: new OpenLayers.Format.OSM({checkTags: true})
                })
            });
            this.mapObject.addLayer(this.dataLayer);

            this.dataLayer.events.on({
                featureselected: function(data) {
                    app.models.pic.set({osmfeature: data.feature});
                    this.$el.find('.osm-selector-buttons button').prop('disabled', false);
                },
                featureunselected: function() {
                    app.models.pic.set({osmfeature: null});
                    this.$el.find('.osm-selector-buttons button').prop('disabled', true);
                },
                scope: this
            });

            this.selector = new OpenLayers.Control.SelectFeature(this.dataLayer, {'toggle': true});
            this.mapObject.addControl(this.selector);
            this.selector.activate();

            this.boxSelector = new (OpenLayers.Class(OpenLayers.Control, { // Create class and instantiate it directly
                initialize: function(layer, selector) {
                    OpenLayers.Control.prototype.initialize.apply(this, []);
                    this.layer = layer;
                    this.mainSelector = selector;
                    this.handler = new OpenLayers.Handler.Box(this, {done: this.selectBox});
                },
                toggle: function () {
                    return (this.active) ? this.deactivate() : this.activate();
                },
                selectBox: function (position) {
                    // Adapted from SelectFeature Control
                    if (position instanceof OpenLayers.Bounds) { // position is a pixel box
                        var minXY = this.map.getLonLatFromPixel({
                                x: position.left,
                                y: position.bottom
                            }),
                            maxXY = this.map.getLonLatFromPixel({
                                x: position.right,
                                y: position.top
                            }),
                            bounds = new OpenLayers.Bounds(
                                minXY.lon, minXY.lat, maxXY.lon, maxXY.lat
                            ),
                            re = new RegExp('^OpenLayers\.Geometry\.(Point|LineString)$'),
                            feature, firstPoint, firstLine;
                        this.mainSelector.unselectAll(); // No multiple selection in our case
                        this.events.triggerEvent("boxselectionstart", {layers: [this.layer]});
                        for(var i=0, len = this.layer.features.length; i<len; ++i) {
                            feature = this.layer.features[i];
                            if (!feature.getVisibility()) {
                                continue;
                            }
                            if (re.test(feature.geometry.CLASS_NAME)) {
                                if (bounds.toGeometry().intersects(feature.geometry)) {
                                    // We want to select only the first point or line, no multiple selection
                                    if (feature.geometry.CLASS_NAME == 'OpenLayers.Geometry.Point' && firstPoint == null) {
                                        firstPoint = feature;
                                        break;
                                    } else if (firstLine == null) {
                                        firstLine = feature;
                                    }
                                }
                            }
                        }
                        feature = (firstPoint != null) ? firstPoint : firstLine;
                        if (feature) this.mainSelector.select(feature);
                        this.events.triggerEvent("boxselectionend", {layers: [this.layer]}); 
                    }
                },
                CLASS_NAME: 'OpenLayers.Control.BoxSelectFeature'
            }))(this.dataLayer, this.selector);
            this.mapObject.addControl(this.boxSelector);

            // Add a button on the map for data loading
            var loadButton = $('<div>')
                .css({position: 'absolute', top: '1em', right: '1em', 'z-index': 1000})
                .append(
                    $('<button type="button">')
                        .addClass('btn').append($('<i>').addClass('icon-refresh'))
                        .on('click', $.proxy(this.loadData, this))
                );
            this.$el.append(loadButton);

            // Add a button for box selection
            var boxButton = $('<div>')
                .css({position: 'absolute', top: '1em', right: '5em', 'z-index': 1000})
                .append(
                    $('<button type="button">')
                        .addClass('btn').append($('<i>').addClass('icon-retweet'))
                        .on('click', this, function(evt) {
                            evt.data.boxSelector.toggle();
                            $(this).toggleClass('active');
                        })
                );
            this.$el.append(boxButton);

            // Add a button to recenter on last know position
            var recenterButton = $('<button type="button">')
                    .addClass('btn').append($('<i>').addClass('icon-screenshot'))
                    .on('click', {pos: app.models.pos, ctx: this}, function(evt) {
                        var coords = evt.data.pos.get('coords');
                        if (coords) {
                            evt.data.ctx.centerMap(coords);
                        }
                    }),
                recenterDiv = $('<div>')
                    .css({position: 'absolute', top: '1em', right: '9em', 'z-index': 1000})
                    .append(recenterButton);
            this.$el.append(recenterDiv);
            // Update the above button when position change
            var updateRecenterButton = function(model) {
                var coords = model.get('coords');
                this.prop('disabled', typeof(coords) === 'undefined');
            }
            app.models.pos.on('change:coords', updateRecenterButton, recenterButton);
            updateRecenterButton.call(recenterButton, app.models.pos); // Force one first call, in case change:coords event has already fired

            // Show current user position (auto updating)
            this.markers = new OpenLayers.Layer.Markers();
            this.mapObject.addLayer(this.markers);
            app.models.pos.on('change:coords', this.showCurrentPosition, this);
            this.showCurrentPosition(app.models.pos); // Force one first call, in case change:coords event has already fired
        },

        showCurrentPosition: function(model) {
            var coords = model.get('coords');
            if (coords) {
                // Reset marker layer from any previous change
                this.markers.clearMarkers();
                this.markers.setOpacity(1);
                // Add a marker on current position
                var lonlat =(new OpenLayers.LonLat(
                        coords.longitude,
                        coords.latitude
                    )).transform(
                        this.mapObject.displayProjection,
                        this.mapObject.projection
                    ),
                    marker = new OpenLayers.Marker(lonlat);
                this.markers.addMarker(marker);
            } else {
                // Dim marker to show loss of signal
                this.markers.setOpacity(0.5);
            }
        },

        centerMap: function(coords) {
            // Zoom to a focus point if any
            this.mapObject.setCenter(
                (new OpenLayers.LonLat(
                    coords.longitude,
                    coords.latitude
                )).transform(
                    this.mapObject.displayProjection,
                    this.mapObject.projection
                ),
                18
            );
        },

        loadData: function() {
            var extent = this.mapObject.getExtent();
            if (extent === null) return; // Map is not initialized yet
            if (this.mapObject.getZoom() < 17) return; // Extent is too wide
            extent = extent.transform(this.mapObject.getProjectionObject(), this.mapObject.displayProjection);
            // /!\ Possible cross-domain request issues here
            this.dataLayer.strategies[0].load({url: 'http://api.openstreetmap.fr/api/0.6/map?bbox='+extent.left+','+extent.bottom+','+extent.right+','+extent.top});
        },

        afterRender: function() {
            this.createMap();
            this.loadData();
            return this;
        },

        onCamera: function(e) {
            e.preventDefault();

            app.routeur.navigate('capture/camera', {trigger: true});
        },

        onGallery: function(e) {
            e.preventDefault();

            app.routeur.navigate('capture/gallery', {trigger: true});
        }
    });

    return app;
})(ImageInOsm);
