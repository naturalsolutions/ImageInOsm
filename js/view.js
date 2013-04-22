"use strict";
var capturePhoto = (function(app) {
app.Views.Capture = Backbone.View.extend({
     manage: true ,
	initialize : function() {
            this.template = _.template($('#capture-template').html());
		   //this.template = _.template(this.templateLoader.get('home'));
    },
	events: {
			"click button#capture": "capturePhoto",
			"click button#save" : "savePhoto",
			"click button#captureEdit": "capturePhotoEdit",
			"click button#getphotoFromLibrary": "getPhoto"
	},
	capturePhoto: function(){
		// app.global.pictureSource=navigator.camera.PictureSourceType;
        //app.global.destinationType=navigator.camera.DestinationType;
		
			// Take picture using device camera and retrieve image as base64-encoded string
		navigator.camera.getPicture(app.utils.onPhotoDataSuccess, app.utils.onFail, { quality: 50,
        destinationType: app.global.destinationType.DATA_URL });
	},
	savePhoto: function(){
		var destination = this.options.destinationType.FILE_URI;
		navigator.camera.getPicture(app.utils.onPhotoFileSuccess, app.utils.onFail, { quality: 50, destinationType: destination });

	},
	
	capturePhotoEdit : function(){
		// Take picture using device camera, allow edit, and retrieve image as base64-encoded string  
      navigator.camera.getPicture(app.utils.onPhotoDataSuccess, app.utils.onFail, { quality: 20, allowEdit: true,
      destinationType: app.global.destinationType.DATA_URL });
	},
	
	getPhoto : function(){
		debugger;
		var source = this.options.pictureSource.PHOTOLIBRARY;
		var destination = this.options.destinationType.FILE_URI;
      // Retrieve image file location from specified source
      navigator.camera.getPicture(app.utils.onPhotoURISuccess, app.utils.onFail, { quality: 50, 
        destinationType: destination,
        sourceType: source });
    },
	onPhotoDataSuccess : function (imageData){
     $("#smallImage").attr("style","display:block");
	 var source = "data:image/jpeg;base64," + imageData;
	 $("#smallImage").attr("src", source);	
	},
	onFail : function(message) {
      alert('Failed because: ' + message);
	}
	
});

return app;
})(capturePhoto);

// -------------------------------------------------- The Views ---------------------------------------------------- //


