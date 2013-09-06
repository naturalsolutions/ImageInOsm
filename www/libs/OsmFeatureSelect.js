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

var OsmFeatureSelector = Backbone.Form.editors.Base.extend({

    tagName: 'div',
    className: 'osm-map',
    attributes: {tabindex: 0}, // make element "focusable"

    mapObject: null,
    dataLayer: null,
    selectedFeature: null,
    selector: null,

    events: {
        'focus': function() {this.trigger('focus', this);},
        'blur': function() {this.trigger('blur', this);}
        //'change' ?
    },

    createMap: function() {
        // Create map once
        if (this.mapObject !== null)
            return this.mapObject;

        // Ensure the map div has a size. FIXME: crappy code, should not be necessary (sizing/positionning is normally controlled by CSS...)
        var mapSize;
        if ('mapSize' in this.schema.mapConfig)
            mapSize = this.schema.mapConfig.mapSize;
        else
            mapSize = {width: '800px', height: '300px'};
        this.$el.css(mapSize);

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
        mapOptions.layers.push(new OpenLayers.Layer.OSM('Fond de plan', this.schema.mapConfig.basemapUrl, _.extend({transitionEffect: 'resize'}, this.schema.mapConfig.basemapOptions)));
        this.mapObject = new OpenLayers.Map(this.el, mapOptions);
        if ('currentPosition' in this.schema.mapConfig) {
            // Zoom to a focus point if any
            this.mapObject.setCenter(
                (new OpenLayers.LonLat([this.schema.mapConfig.currentPosition.lon, this.schema.mapConfig.currentPosition.lat])).transform(mapOptions.displayProjection, mapOptions.projection),
                18
            );
        } else {
            // Zoom to a wide extent otherwise
            var ext = this.schema.mapConfig.mapExtent,
                bounds = new OpenLayers.Bounds([ext.minx, ext.miny, ext.maxx, ext.maxy]);
            this.mapObject.zoomToExtent(bounds.transform(mapOptions.displayProjection, mapOptions.projection));
        }

        // Add vector data layer
        this.dataLayer = new OpenLayers.Layer.Vector('Données', {
            strategies: [new OpenLayers.Strategy.Fixed()],
            projection: 'EPSG:4326',
            protocol: new OpenLayers.Protocol.HTTP({
                format: new OpenLayers.Format.OSM()
            })
        });
        this.mapObject.addLayer(this.dataLayer);

        this.dataLayer.events.on({
            loadend: this.triggerChange,
            featureselected: this.triggerChange,
            featureunselected: this.triggerChange,
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

        if (this.value !== null) this.setValue(this.value);

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
        var recenterButton = $('<div>')
            .css({position: 'absolute', top: '1em', right: '9em', 'z-index': 1000})
            .append(
                $('<button type="button">')
                    .addClass('btn').append($('<i>').addClass('icon-screenshot'))
                    .on('click', this, function(evt) {
                        var pos = evt.data.schema.mapConfig.currentPosition;
                        if (pos) {
                            // Zoom to a focus point if any
                            var map = evt.data.mapObject;
                            map.setCenter(
                                (new OpenLayers.LonLat(
                                    pos.lon,
                                    pos.lat
                                )).transform(
                                    map.displayProjection,
                                    map.projection
                                ),
                                18
                            );
                        }
                    })
            );
        this.$el.append(recenterButton);

        // Show current user position (auto updating)
        this.markers = new OpenLayers.Layer.Markers();
        this.mapObject.addLayer(this.markers);
        this.iAmHere = new OpenLayers.Marker();
        navigator.geolocation.watchPosition(
            _.bind(function(position) {
                console.log(position);
                this.global.currentPosition = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                this.markers.clearMarkers();
                this.markers.setOpacity(1);
                this.marker.lonlat = (new OpenLayers.LonLat(
                    position.coords.longitude,
                    position.coords.latitude
                )).transform(
                    this.map.displayProjection,
                    this.map.projection
                );
                this.markers.addMarker(this.marker);
            }, {map: this.mapObject, markers: this.markers, marker: this.iAmHere, global: this.schema.mapConfig}),
            _.bind(function() {
                this.markers.setOpacity(0.5);
            }, {markers: this.markers}),
            {maximumAge: 200000, enableHighAccuracy: false}
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

    triggerChange: function() {this.trigger('change', this);},

    render: function() {
        this.createMap();
        this.loadData();
        return this;
    },

    getValue: function() {
        if (this.dataLayer.selectedFeatures.length == 1)
            return this.dataLayer.selectedFeatures[0];
        return null;
    },
    setValue: function(value) {
        var i, j, f;
        for (i=0; i<this.dataLayer.features.length; i++) {
            f = this.dataLayer.features[i];
            if (f.fid == value) {
                for (j=0; j<this.dataLayer.selectedFeatures.length; j++) {
                    this.selector.unselect(this.dataLayer.selectedFeatures[j]);
                }
                this.selector.select(f);
                return;
            }
        }
        console.log('OsmFeatureSelector: feature is not available in the current scope');
    },

    focus: function() {
        if (this.hasFocus) return;
        this.$el.focus();
    },
    blur: function() {
        if (!this.hasFocus) return;
        this.$el.blur();
    }
});
