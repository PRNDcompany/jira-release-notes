"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const request = __importStar(require("request-promise"));
const _ = __importStar(require("lodash"));
(async () => {
    const domain = core.getInput("domain");
    const project = core.getInput("project");
    const version = core.getInput("version");
    const token = core.getInput("auth-token");
    const baseUrl = `https://${domain}.atlassian.net/`;
    try {
        const markdownReleaseNote = await getMarkdownReleaseNotes(baseUrl, project, version, token);
        console.log(markdownReleaseNote);
        core.setOutput("release_notes", markdownReleaseNote);
        const releaseNotesUrl = await getReleaseNotesUrl(baseUrl, domain, project, version, token);
        console.log(releaseNotesUrl);
        core.setOutput("release_notes_url", releaseNotesUrl);
    }
    catch (error) {
        core.setFailed(error.message);
    }
})();
async function getMarkdownReleaseNotes(baseUrl, project, version, token) {
    const url = baseUrl + "rest/api/3/search/jql";
    const response = await request.get(url, {
        headers: {
            Authorization: `Basic ${token}`
        },
        qs: {
            "jql": `project=\"${project}\" AND fixVersion =\"${version}\"`,
            maxResults: 1000,
            fields: "project,issuetype,summary",
        },
        json: true,
    });
    const title = getTitle(response, version);
    const note = getNote(response, baseUrl);
    return title + note;
}
function getTitle(response, version) {
    var _a, _b, _c, _d;
    const projectName = (_d = (_c = (_b = (_a = response.issues[0]) === null || _a === void 0 ? void 0 : _a.fields) === null || _b === void 0 ? void 0 : _b.project) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : "";
    return `# Release notes - ${projectName} - Version ${version}`;
}
function getNote(response, baseUrl) {
    const groupedIssues = getGroupedIssues(response.issues, baseUrl);
    if (groupedIssues.length == 0) {
        return "";
    }
    return groupedIssues.reduce((result, groupedIssue) => {
        result += "\n\n";
        result += `### ${groupedIssue.type}`;
        groupedIssue.issues.forEach(issue => {
            result += `\n\n[${issue.key}](${issue.url}) ${issue.summary}`;
        });
        return result;
    }, "");
}
function getGroupedIssues(rawValue, baseUrl) {
    const issues = rawValue.map((value) => {
        const key = value.key;
        const url = baseUrl + "browse/" + key;
        const fields = value.fields;
        const summary = fields.summary;
        const type = fields.issuetype.name;
        return new Issue(key, summary, type, url);
    }).sort((a, b) => {
        return a.type > b.type ? 1 : -1;
    });
    const groupedResult = _.groupBy(issues, function (issue) {
        return issue.type;
    });
    return _.map(groupedResult, (items, key) => {
        return new GroupedIssue(key, items);
    });
}
async function getReleaseNotesUrl(baseUrl, domain, project, version, token) {
    var _a;
    const url = `${baseUrl}rest/api/3/project/${project}/version`;
    const response = await request.get(url, {
        headers: {
            Authorization: `Basic ${token}`
        },
        qs: {
            query: version,
        },
        json: true,
    });
    const versionId = (_a = response.values[0]) === null || _a === void 0 ? void 0 : _a.id;
    if (versionId == undefined) {
        return "";
    }
    return `https://${domain}.atlassian.net/projects/${project}/versions/${versionId}`;
}
class Issue {
    constructor(key, summary, type, url) {
        this.key = key;
        this.summary = summary;
        this.type = type;
        this.url = url;
    }
}
class GroupedIssue {
    constructor(type, issues) {
        this.type = type;
        this.issues = issues;
    }
}
