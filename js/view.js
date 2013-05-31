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

        events: {
            'click #send-button-flickr': 'onSendFlickr'
        },

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
            // Take picture using device camera and retrieve image as a local path
            navigator.camera.getPicture(
                _.bind(this.onSuccess, this),
                _.bind(this.onFail, this),
                {
                    quality: 50,
                    correctOrientation: false,
                    encodingType: navigator.camera.EncodingType.JPEG,
                    source: navigator.camera.PictureSourceType.CAMERA,
                    targetWidth: 1024,
                    destinationType: navigator.camera.DestinationType.FILE_URI
                });
        },

        onSuccess: function(imageURI) {
            this.$el.find('.img-preview img').attr('src', imageURI);
        },

        onFail: function(message) {
            this.$el.find('.img-preview').hide();
            this.$el.find('.img-error').show();
            this.$el.find('#img-error-msg').html(message);
        },

        onSendFlickr: function(e) {
            this.server = new app.utils.FlickrAPI({
                consumerKey: '77f739a96134f39fcd38ff74c72b1fc8', // Application identifier (should be kept secret, don't use OAuth with JavaScript...)
                consumerSecret: 'a27edc675234f748',
                callbackUrl: 'http://localhost/' // Use any valid URL as a callback, we just use it to intercept the callback redirection
            });
            this.sendPicture();
        },

        sendPicture: function() {
            this.server.authenticate().then(
                function() {
                    // TODO: Check user limits
                    // TODO: Send picture
                },
                function(msg) {
                    // TODO: go to notification view + replace('\n', '<br/>')
                    alert(msg);
                }
            );
        }
    });

    return app;
})(capturePhoto);