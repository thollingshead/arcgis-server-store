module.exports = function(grunt) {
	// Configure Tasks
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		jshint: {
			src: ['*.js', 'tests/*.js', 'tests/mocking/*.js', '!Gruntfile.js', '!profile.js', '!ArcGISServerStore.min.js'],
			options: {
				jshintrc: '.jshintrc'
			}
		},

		uglify: {
			default: {
				files: {
					'ArcGISServerStore.min.js': ['./ArcGISServerStore.js']
				},
			},
			options: {
				compress: true,
				mangle: true,
				preserveComments: false,
				banner: '/* <%= pkg.name %> <%= pkg.version%> | ' +
								'<%= grunt.template.today("yyyy-mm-dd") %> | ' +
								'github.com/thollingshead/arcgis-server-store */\n'
			}
		},

		watch: {
			files: ['*.js'],
			tasks: ['jshint', 'uglify']
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
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-esri-slurp');
	grunt.loadNpmTasks('grunt-bower-install-simple');

	// Intermediate Tasks
	grunt.registerTask('bower', ['bower-install-simple']);

	// User-called Tasks
	grunt.registerTask('setup', grunt.file.exists('tests/libs/esri/package.json') ? ['bower'] : ['esri_slurp', 'bower']);
	grunt.registerTask('default', 'Watches the project for changes, and automatically performs linting/testing.', ['jshint', 'uglify', 'watch']);
};
