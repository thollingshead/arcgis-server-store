module.exports = function(grunt) {
	// Configure Tasks
	grunt.initConfig({
		jshint: {
			src: ['*.js', '!Gruntfile.js'],
			options: {
				jshintrc: '.jshintrc'
			}
		},

		watch: {
			files: ['*.js'],
			tasks: ['jshint', 'test']
		},

		esri_slurp: {
			dev: {
				options: {
					version: '3.10',
					packageLocation: 'tests/libs/esri',
					beautify: true
				}
			}
		},
		'bower-install-simple': {
			options: {
				directory: 'tests/libs'
			}
		},

		intern: {
			console: {
				options: {
					config: 'tests/intern',
					reporters: ['console']
				}
			}
		}
	});

	// Load Tasks
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-esri-slurp');
	grunt.loadNpmTasks('grunt-bower-install-simple');
	grunt.loadNpmTasks('intern');

	// Intermediate Tasks
	grunt.registerTask('bower', ['bower-install-simple']);

	// User-called Tasks
	grunt.registerTask('setup', grunt.file.exists('tests/libs/esri/package.json') ? ['bower'] : ['esri_slurp', 'bower']);
	grunt.registerTask('test', ['setup', 'intern:console']);
	grunt.registerTask('default', 'Watches the project for changes, and automatically performs linting/testing.', ['jshint', 'test', 'watch']);
};