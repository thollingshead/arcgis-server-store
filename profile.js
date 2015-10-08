var profile = (function(){
    return {
        resourceTags: {
            test: function(filename, mid){
                return /tests/.test(filename);
            },
            amd: function(filename, mid) {
                return /ArcGISServerStore\.js$/.test(filename) && !/tests/.test(filename);
            }
        }
    };
})();
