'use strict';
/**
 * Collect PMD rules from PMD original source code
 * Link: https://github.com/pmd/pmd/tree/master/pmd-java/src/main/resources/category/java
 */
var path = require('path');
var fs = require('fs');
var https = require('https');
var url = require('url');

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
	output += strArray.map(x => '\'' + x + '\'').join(',\n')
	output += '];'
	return output
}

async function collectRules(rule_url) {
	const rules = []
	download(rule_url).then(function (content) {
		try {
			const rulePath = `src/lint-manager/eslint/rules-js.ts`
            const parsed = JSON.parse(content);

            for (let key in parsed) {
                rules.push(key)
            }

			fs.writeFileSync(rulePath, strArray2tsCode(rules));
			console.log('Updated ' + path.basename(rulePath));
		} catch(e) { console.log(e) }
	})
}

collectRules('https://raw.githubusercontent.com/eslint/eslint/master/tools/rule-types.json');
