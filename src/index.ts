import * as core from "@actions/core";

import * as request from "request-promise";
import * as _ from 'lodash'

(async () => {
    const domain = core.getInput("domain")
    const project = core.getInput("project")
    const version = core.getInput("version")
    const token = core.getInput("auth-token")

    const baseUrl = `https://${domain}.atlassian.net/`

    try {
        const markdownReleaseNote = await getMarkdownReleaseNotes(baseUrl, project, version, token)
        console.log(markdownReleaseNote)
        core.setOutput("release_notes", markdownReleaseNote);

        const releaseNotesUrl = await getReleaseNotesUrl(baseUrl, domain, project, version, token)
        console.log(releaseNotesUrl)
        core.setOutput("release_notes_url", releaseNotesUrl);
    } catch (error: any) {
        core.setFailed(error.message);
    }

})();

async function getMarkdownReleaseNotes(baseUrl: string, project: string, version: string, token: string,): Promise<string> {
    const url = baseUrl + "rest/api/3/search"
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

    const title = getTitle(response, version)
    const note = getNote(response, baseUrl)
    return title + note

}

function getTitle(response: any, version: string): string {
    const projectName = response.issues[0]?.fields?.project?.name ?? ""
    return `# Release notes - ${projectName} - Version ${version}`
}

function getNote(response: any, baseUrl: string): string {
    const groupedIssues = getGroupedIssues(response.issues, baseUrl)
    if (groupedIssues.length == 0) {
        return ""
    }

    return groupedIssues.reduce((result: string, groupedIssue: GroupedIssue) => {
        result += "\n\n"
        result += `### ${groupedIssue.type}`
        groupedIssue.issues.forEach(issue => {
            result += `\n\n[${issue.key}](${issue.url}) ${issue.summary}`
        })
        return result
    }, "")
}

function getGroupedIssues(rawValue: any, baseUrl: string): GroupedIssue[] {
    const issues: Issue[] = rawValue.map((value: any) => {

        const key = value.key
        const url = baseUrl + "browse/" + key

        const fields = value.fields
        const summary = fields.summary
        const type = fields.issuetype.name

        return new Issue(key, summary, type, url)
    }).sort((a: Issue, b: Issue) => {
        return a.type > b.type ? 1 : -1
    })

    const groupedResult: _.Dictionary<Issue[]> = _.groupBy<Issue>(issues, function (issue: Issue) {
        return issue.type
    })
    return _.map(groupedResult, (items: Issue[], key: string) => {
        return new GroupedIssue(key, items);
    });
}

async function getReleaseNotesUrl(baseUrl: string, domain: string, project: string, version: string, token: string,): Promise<string> {
    const url = `${baseUrl}rest/api/3/project/${project}/version`
    const response = await request.get(url, {
        headers: {
            Authorization: `Basic ${token}`
        },
        qs: {
            query: version,
        },
        json: true,
    });
    const versionId = response.values[0]?.id
    if (versionId == undefined) {
        return ""
    }
    return `https://${domain}.atlassian.net/projects/${project}/versions/${versionId}`
}

class Issue {

    key: string
    summary: string
    type: string
    url: string

    constructor(key: string, summary: string, type: string, url: string) {
        this.key = key;
        this.summary = summary;
        this.type = type;
        this.url = url;
    }
}

class GroupedIssue {
    type: string
    issues: Issue[]

    constructor(type: string, issues: Issue[]) {
        this.type = type;
        this.issues = issues;
    }
}