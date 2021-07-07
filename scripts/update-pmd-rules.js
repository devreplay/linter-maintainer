'use strict';
/**
 * Collect PMD rules from PMD original source code
 * Link: https://github.com/pmd/pmd/tree/master/pmd-java/src/main/resources/category/java
 */
var path = require('path');
var fs = require('fs');
var https = require('https');
var url = require('url');
var parser = require('fast-xml-parser');

function getOptions(urlString) {
	var _url = url.parse(urlString);
	var headers = {};
	var token = process.env['GITHUB_TOKEN'];
	if (token) {
		headers['Authorization'] = 'token ' + token;
	}
	return {
		protocol: _url.protocol,
		host: _url.host,
		port: _url.port,
		path: _url.path,
		headers: headers
	};
}

/**
 * @param {string} url
 * @param {number} redirectCount
 */
function download(url, redirectCount) {
	return new Promise((c, e) => {
		var content = '';
		https.get(getOptions(url), function (response) {
			response.on('data', function (data) {
				content += data.toString();
			}).on('end', function () {
				if (response.statusCode === 403 && response.headers['x-ratelimit-remaining'] === '0') {
					e('GitHub API rate exceeded. Set GITHUB_TOKEN environment variable to increase rate limit.');
					return;
				}
				let count = redirectCount || 0;
				if (count < 5 && response.statusCode >= 300 && response.statusCode <= 303 || response.statusCode === 307) {
					let location = response.headers['location'];
					if (location) {
						console.log("Redirected " + url + " to " + location);
						download(location, count + 1).then(c, e);
						return;
					}
				}
				c(content);
			});
		}).on('error', function (err) {
			e(err.message);
		});
	});
}

function strArray2tsCode(strArray) {
	let output = 'export const rules: string[] = [\n'
	output += strArray.join(',\n')
	output += '];'
	return output
}

var options = {
    attributeNamePrefix : "@_",
    ignoreAttributes : false,
    parseAttributeValue : true,
};

async function collectRules(category, rule_url) {
	const rules = []
	download(rule_url).then(function (content) {
		try {
			if( parser.validate(content) === true) { //optional (it'll return an object in case it's not valid)
				var jsonObj = parser.parse(content, options);
				for (const rule of jsonObj['ruleset']['rule']) {
					if (rule['@_deprecated'] !== true) {
						rules.push("'" + rule['@_name'] + "'");
					}
				}
			}
			const rulePath = `src/lint-manager/pmd/rules/${category}.ts`
			const fullRules = rules.map(x => `category/java/${category}.xml/${x.slice(1,-1)}`)
			all_rules.push(...fullRules)
			added_category.push(category)
			if (added_category.length == PMD_CATEGORY.length) {
				writeRules(all_rules)
			}
			fs.writeFileSync(rulePath, strArray2tsCode(rules));
			console.log('Updated ' + path.basename(rulePath));
		} catch(e) { console.log(e) }
	})
}

async function executeAll() {
	const pmd_header = 'https://raw.githubusercontent.com/pmd/pmd/master/pmd-java/src/main/resources'

	PMD_CATEGORY.map(x => {
		return [x, `${pmd_header}/category/java/${x}.xml`];
	}).forEach((x) => { collectRules(x[0], x[1]) } );
}

function writeRules(rules) {
	// const rulePathes = PMD_CATEGORY.map(x => `${pmd_header}/category/java/${x}.xml` )
	const head = [
		'<?xml version="1.0"?>',
		'<ruleset name="yourrule"',
		'xmlns="http://pmd.sourceforge.net/ruleset/2.0.0"',
		'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
		'xsi:schemaLocation="http://pmd.sourceforge.net/ruleset/2.0.0 https://pmd.sourceforge.io/ruleset_2_0_0.xsd">',
		'<description>Your configuration of PMD. Includes the rules that are most likely to apply for you.</description>'];
	const content = rules.map(x => { return `<rule ref="${x}"/>` } );
	const tail = '</ruleset>';
	const rulePath = `src/lint-manager/pmd/rules/all-java.xml`
	const output = [...head, ...content, tail].join('\n');
	fs.writeFileSync(rulePath, output);
	console.log('Updated ' + path.basename(rulePath));
}


const PMD_CATEGORY = [
	'bestpractices',
	'codestyle',
	'design',
	'documentation',
	'errorprone',
	'multithreading',
	'performance',
	'security'
]
let added_category = []
let all_rules = []
executeAll()

