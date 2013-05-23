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

        events: {
			"click button#capture": "capturePhoto",
			"click button#save" : "savePhoto",
			"click button#captureEdit": "capturePhotoEdit",
			"click button#getphotoFromLibrary": "getPhoto"
        },

        capturePhoto: function() {
			// Take picture using device camera and retrieve image as base64-encoded string
            navigator.camera.getPicture(app.utils.onPhotoDataSuccess, app.utils.onFail, {
                quality: 50,
                destinationType: navigator.camera.DestinationType.DATA_URL
            });
        },

        savePhoto: function() {
            navigator.camera.getPicture(app.utils.onPhotoFileSuccess, app.utils.onFail, {
                quality: 50,
                destinationType: navigator.camera.DestinationType.FILE_URI
            });
        },

        capturePhotoEdit : function() {
            // Take picture using device camera, allow edit, and retrieve image as base64-encoded string
            navigator.camera.getPicture(app.utils.onPhotoDataSuccess, app.utils.onFail, {
                quality: 20,
                allowEdit: true,
                destinationType: navigator.camera.DestinationType.DATA_URL
            });
        },

        getPhoto : function() {
            // Retrieve image file location from specified source
            navigator.camera.getPicture(app.utils.onPhotoURISuccess, app.utils.onFail, {
                quality: 50,
                destinationType: navigator.camera.DestinationType.FILE_URI,
                sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY
            });
        }
    });

    return app;
})(capturePhoto);