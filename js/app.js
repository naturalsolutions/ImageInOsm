var capturePhoto = (function(app) {
    "use strict";
	app = {
		Collections: {},
		Models: {},
		Views: {},
		// Instances
		collections: {},
		views: {},
		models: {},
		markers:{},
		utils: {},
		global:{}
	};
	

if(window.PhoneGap){
    document.addEventListener("deviceready",onDeviceReady,false);
}else{
  $(document).ready(function(){
    onDeviceReady();
  });
}
	
	
app.init = function () {	
	var initalizers = [];	
	initalizers.push(
                    $.ajax({
                        url: 'tpl/templates.html',
                        dataType: 'text'
                    }).done(function(contents) {
                        $("#templates").append(contents);
                    })
    );
	//initalizers.push();
	$.when.apply($, initalizers).done(function() {
		
		app.router = new app.Router();
		Backbone.history.start();
		 app.global.pictureSource = navigator.camera.PictureSourceType;
		app.global.destinationType = navigator.camera.DestinationType;
        });
  };
 
 // a deplacer dans utils
 
 function onDeviceReady() {
    app.global.pictureSource = navigator.camera.PictureSourceType;
    app.global.destinationType = navigator.camera.DestinationType;
	app.init();
 }

	
 return app;
})(capturePhoto);