var OsmFeatureSelector = Backbone.Form.editors.Base.extend({
    /*
     * TODO:
     * o ajouter la possibiliter de filtrer sur tag/key
     * x sélectionner this.value lors de l'init le cas échéant
     * o ajouter un  marqueur "vous êtes ici"
     * o étendre OL.Protocol.HTTP pour définir filterToParams
     * o essayer de positionner la carte en CSS (déporter le createmap ? sur quel évènement ?)
     */

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
            controls: [
                new OpenLayers.Control.Attribution(),
                new OpenLayers.Control.TouchNavigation({dragPanOptions: {enableKinetic: true}}),
                new OpenLayers.Control.Zoom()
            ],
            layers: []
        };
        if ('basemapUrl' in this.schema.mapConfig) {
            mapOptions.layers.push(new OpenLayers.Layer.OSM('Fond de plan', this.schema.mapConfig.basemapUrl, {tileOptions: {crossOriginKeyword: null}, transitionEffect: 'resize'}));
        } else {
            mapOptions.layers.push(new OpenLayers.Layer.OSM('Fond de plan', null, {transitionEffect: 'resize'}));
        }
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
            featureselected: function (e) {
                this.trigger('change', this);
            },
            featureunselected: function (e) {
                this.trigger('change', this);
            },
            scope: this
        });

        this.selector = new OpenLayers.Control.SelectFeature(this.dataLayer, {'toggle': true});
        this.mapObject.addControl(this.selector);
        this.selector.activate();
        
        if (this.value !== null) this.setValue(this.value);
    },

    loadData: function() {
        var extent = this.mapObject.getExtent();
        if (extent === null) return; // Map is not initialized yet
        if (this.mapObject.getZoom() < 17) return; // Extent is too wide
        extent = extent.transform(this.mapObject.getProjectionObject(), this.mapObject.displayProjection);
        // /!\ Possible cross-domain request issues here
        this.dataLayer.strategies[0].load({url: 'http://api.openstreetmap.fr/api/0.6/map?bbox='+extent.left+','+extent.bottom+','+extent.right+','+extent.top});
    },

    render: function() {
        this.createMap();
        this.loadData();
        return this;
    },

    getValue: function() {
        if (this.dataLayer.selectedFeatures.length == 1)
            return this.dataLayer.selectedFeatures[0].fid;
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