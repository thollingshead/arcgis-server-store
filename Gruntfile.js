module.exports = function(grunt) {
	// Configure Tasks
	grunt.initConfig({
		jshint: {
				src: [ '*.js', '!Gruntfile.js' ],
				options: {
					jshintrc: '.jshintrc'
				}
		},

		watch: {
			files: [ '*.js' ],
			tasks: [ 'jshint' ]
		}
	});

	// Load Tasks
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');

	// User-called Tasks
	grunt.registerTask('default', 'Watches the project for changes, and automatically performs linting/testing.', ['jshint', 'watch']);
};