import * as core from '@actions/core';
import * as github from '@actions/github';

function versionRegex() {
    const prefix = core.getInput('prefix');
    return new RegExp(`${prefix}(\d+)\.(\d+)\.(\d+)`);
}

async function findLastVersion() {
    const token = core.getInput('token');

    const { data } = await github.getOctokit(token).repos.listTags({ ...github.context.repo });

    const regex = versionRegex();
    const versions = data.map(t => t.name.match(regex)).filter(v => !!v) as RegExpMatchArray[];

    const s = (a: RegExpMatchArray) => {
        const [, m, r, b] = a.map(v => Number.parseInt(v));
        return m * 1000000 + r * 1000 + b
    };
    const latest = versions.sort((a, b) => s(a) - s(b))[0];

    return data[versions.indexOf(latest)].name;
}

function increment(version: string, by: string) {
    const match = version.match(versionRegex())
    const prefix = core.getInput('prefix');

    console.log('Last version', version);
    console.log('Regex', versionRegex());

    if (!match) throw new Error(`'${version}' is not a valid version`)

    console.log('Match', match);

    const fragments = ['major', 'release', 'bug'];
    const i = fragments.indexOf(by);
    if (i < 0) throw new Error(`'${by} is not a valid fragment`)
    const v = match.slice(1, match.length).map(d => Number.parseInt(d));

    console.log('Version parts', v.join(', '));

    v[i]++;

    return prefix + v.join('.');
}

async function run() {

    const last_version = core.getInput('last-version') || await findLastVersion();

    if (last_version) {

        const fragment = core.getInput('default-fragment')
        const next = increment(last_version, fragment);

        core.setOutput('next', next)
    } else {
        const fallback = core.getInput('fallback')
        if (!versionRegex().test(fallback)) throw new Error(`Fallback '${fallback}' is not a valid version`)
        core.setOutput('next', fallback);
    }

}

run().catch(e => core.setFailed(e.message));