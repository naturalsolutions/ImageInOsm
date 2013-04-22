"use strict";
var capturePhoto = (function(app) {
// ----------------------------------------------- The Application Router ------------------------------------------ //

app.Router = Backbone.Router.extend({
  
  routes: {
	"": "home" 
  
  },

  initialize: function() {},

  home: function(){
		app.views.main = new Backbone.Layout({
				template: "#main-layout"
		});
	    $("#content").empty().append(app.views.main.el);
	    app.views.main.setView(".captureContent", new app.Views.Capture({pictureSource: app.global.pictureSource, destinationType : app.global.destinationType}));
	    app.views.main.render();
  }
 
});


return app;
})(capturePhoto);