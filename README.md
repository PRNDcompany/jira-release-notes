# Jira Release Notes
This action generate release notes markdown from Jira project by version

```markdown
# Release notes - Android - Version Customer 1.1.0

### Bug
[HDA-1234](https://your-domain.atlassian.net/browse/HDA-1234) XXXXXXX

### Epic
[HDA-1235](https://your-domain.atlassian.net/browse/HDA-1235) XXXXXXX

### Improvement
[HDA-2345](https://your-domain.atlassian.net/browse/HDA-2345) XXXXXXX
[HDA-2346](https://your-domain.atlassian.net/browse/HDA-2346) XXXXXXX

### Task
[HDA-7777](https://your-domain.atlassian.net/browse/HDA-7777) XXXXXXX
[HDA-7780](https://your-domain.atlassian.net/browse/HDA-7780) XXXXXXX
[HDA-7790](https://your-domain.atlassian.net/browse/HDA-7790) XXXXXXX
```

![](art/screenshot_jira_release_note.png)

## Inputs
- `domain`:  domain name. ex) `https://your-domain.atlassian.net`.
- `project`:  project id. 
- `version`:  version name. ex) `Customer 1.1.0`
- `auth-token`:  auth token key.(Not Api key) 

### Auth Token
https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/

1. Generate an API token for Jira using your [Atlassian Account](https://id.atlassian.com/manage/api-tokens).
2. Build a string of the form `useremail:api_token`. (ted@prnd.co.kr:xxxxxxx) 
3. BASE64 encode the string.
- Linux/Unix/MacOS:
```
echo -n user@example.com:api_token_string | base64
```
- Windows 7 and later, using Microsoft Powershell:
```
$Text = ‘user@example.com:api_token_string’
$Bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
$EncodedText = [Convert]::ToBase64String($Bytes)
$EncodedText
```


## Outputs
- `release_note`: Release notes (Markdown format) 
- `release_notes_url`: Release notes URL(Jira version url) 

## Example usage
```yaml
name: Jira Release Notes
on:
  push:
    branches: [ main ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Extract version name
      run: echo "##[set-output name=version;]$(echo '${{ github.event.head_commit.message }}' | egrep -o '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}')"
      id: extract_version_name           
    - name: Jira Release Notes
      id: release_notes
      uses: PRNDcompany/jira-release-note@v0.1
      with:
        domain: 'your-domain'
        project: 'HDA'
        version: Customer ${{ steps.extract_version_name.outputs.version }}
        auth-token: 'xxxxxxxx'
    - name: Print Release Notes
      run: |
        echo ${{ steps.release_notes.outputs.release_notes }}
```
