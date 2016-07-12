const appRoot = 'src/';
const outputRoot = 'dist/';
const exportSrvRoot = 'export/';

module.exports = {
	root: appRoot,
	source: appRoot + '**/*.js',
	html: appRoot + '**/*.html',
	css: appRoot + '**/*.styl',
	output: outputRoot,
	exportSrv: exportSrvRoot
};
