var capturePhoto = (function(app) {
    "use strict";

    app.Views.OsmSelect = Backbone.Layout.extend({
        template: "#osm-selector-page",

        events: {
            'submit [name="osm-selector-form"]': 'onSubmit'
        },

        afterRender: function() {
            // Adding {manage: true} to BB.Form failed, hence this manual subview
            this.form = new Backbone.Form({model: app.models.pic, fields: ['osmid']});
            this.form.on('osmid:change', _.bind(this.onOsmSelectChange, this));
            this.$el.find('.osm-selector').empty().append(this.form.render().$el);
        },

        onOsmSelectChange: function(form, editor) {
            var val = editor.getValue();
            this.$el.find('.osm-selector-buttons button').prop('disabled', (val === null));
        },

        onSubmit: function(e) {
            // Don't actually submit the <form>
            e.preventDefault();

            this.form.commit();

            app.views.main.setView(new app.Views.Capture());
            app.views.main.render();
        }
    });

    app.Views.Capture = Backbone.View.extend({
        manage: true,

        initialize : function() {
            this.template = _.template($('#capture-template').html());
        },

        serialize : function() {
            return {osmid: app.models.pic.attributes.osmid};
        },

        afterRender: function() {
            // Immediatly launch camera when view is rendered
            this.capturePhoto();
        },

        capturePhoto: function() {
			// Take picture using device camera and retrieve image as base64-encoded string
            navigator.camera.getPicture(
                _.bind(this.onSuccess, this),
                _.bind(this.onFail, this),
                {
                    quality: 70,
                    destinationType: navigator.camera.DestinationType.DATA_URL
                });
        },

        onSuccess: function(imageData) {
            this.$el.find('.img-preview img').attr('src', 'data:image/jpeg;base64,' + imageData);
        },

        onFail: function(message) {
            this.$el.find('.img-preview').hide();
            this.$el.find('.img-error').show();
            this.$el.find('#img-error-msg').html(message);
        }
    });

    return app;
})(capturePhoto);