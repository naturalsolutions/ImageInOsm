var OsmFeatureSelector = Backbone.Form.editors.Base.extend({
    /*
     * TODO:
     * o ajouter la possibiliter de filtrer sur tag/key
     * x sélectionner this.value lors de l'init le cas échéant
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

        // Ensure the map div has a size. FIXME: crappy code, should not be necessary (size is controlled by CSS)
        this.$el.css(this.schema.mapSize || {width: '800px', height: '300px'});

        // Initialize map with baselayer, projection, center, etc...
        var mapOptions = {
            projection: new OpenLayers.Projection('EPSG:3857'),
            displayProjection: new OpenLayers.Projection('EPSG:4326'),
            layers: []
        };
        if ('basemapUrl' in this.schema) {
            mapOptions.layers.push(new OpenLayers.Layer.OSM('Fond de plan', this.schema.basemapUrl, {tileOptions: {crossOriginKeyword: null}}));
        } else {
            mapOptions.layers.push(new OpenLayers.Layer.OSM('Fond de plan'));
        }
        if ('mapCenter' in this.schema) {
            mapOptions.center = (new OpenLayers.LonLat([this.schema.mapCenter.lon, this.schema.mapCenter.lat])).transform(mapOptions.displayProjection, mapOptions.projection);
            mapOptions.zoom = this.schema.mapCenter.zoom;
        }
        this.mapObject = new OpenLayers.Map(this.el, mapOptions);

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
        var url;
        if (window.location.host == '') {// Debug environment, avoid cross-domain policy issues...
            url = 'map.osm';
        } else {
            var extent = this.mapObject.getExtent();
            if (extent === null) return; // Map is not initialized yet
            extent = extent.transform(this.mapObject.getProjectionObject(), this.mapObject.displayProjection);
            url = 'http://api.openstreetmap.fr/api/0.6/map?bbox='+extent.left+','+extent.bottom+','+extent.right+','+extent.top;
        }
        this.dataLayer.strategies[0].load({url: url});
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