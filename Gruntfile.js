module.exports = function(grunt) {
	// Configure Tasks
	grunt.initConfig({
		jshint: {
			src: ['*.js', 'tests/*.js', 'tests/mocking/*.js', '!Gruntfile.js', '!profile.js'],
			options: {
				jshintrc: '.jshintrc'
			}
		},

		watch: {
			files: ['*.js'],
			tasks: ['jshint']
		},

		esri_slurp: {
			dev: {
				options: {
					version: '3.13',
					beautify: true
				},
				dest: 'tests/libs/esri'
			}
		},
		'bower-install-simple': {
			options: {
				directory: 'tests/libs'
			}
		}
	});

	// Load Tasks
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-esri-slurp');
	grunt.loadNpmTasks('grunt-bower-install-simple');

	// Intermediate Tasks
	grunt.registerTask('bower', ['bower-install-simple']);

	// User-called Tasks
	grunt.registerTask('setup', grunt.file.exists('tests/libs/esri/package.json') ? ['bower'] : ['esri_slurp', 'bower']);
	grunt.registerTask('default', 'Watches the project for changes, and automatically performs linting/testing.', ['jshint', 'watch']);
};