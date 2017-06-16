#!/usr/bin/env node

const path = require("path");
const argv = require("minimist")(process.argv.slice(2));
const nodegit = require("nodegit");
const logUpdate = require("log-update");
const hasUnicode = require("has-unicode");
const formatColumns = require("colm");
const { green, red, yellow, magenta, bold, dim, white, black, underline } = require("chalk");

const headings = !!argv.h;
const showBranch = !!argv.b;
const boringChars = !!argv.boring
const watch = (argv.w && 5) || argv.watch;
const directories = argv._.map(dir => path.resolve(process.cwd(), dir));

let SYMBOL_OK,
    SYMBOL_NOTOK,
    SYMBOL_PENDING;

if (!hasUnicode() || boringChars) {
    SYMBOL_OK = "✔";
    SYMBOL_NOTOK = "✘";
    SYMBOL_PENDING = "~";
} else {
    SYMBOL_OK = "🌞 ";
    SYMBOL_NOTOK = "☔️ ";
    SYMBOL_PENDING = "☕️ ";
}

const frames = [
    "✶",
    "✸",
    "✹",
    "✺",
    "✹",
    "✷"
];
let lastStats = null,
    statsCanBeRefreshed = true;

function buildText() {
    return getStats()
        .then(function __renderStats(repos) {
            const lines = [];
            if (headings) {
                const headingNames = ["Clean", "Add", "Del", "Mod", "Rn"];
                if (showBranch) {
                    headingNames.unshift("Branch");
                }
                headingNames.unshift("Directory");
                lines.push(headingNames.map(item => underline(item)));
            }
            repos.forEach(({ dir, error, counts, branch }) => {
                const totalDifferences = counts.added + counts.removed + counts.edited +
                    counts.renamed;
                const isDiff = totalDifferences > 0;
                const stats = [];
                let colourItem = argv.invert ? black : white;
                if (error) {
                    colourItem = dim;
                    stats.push(red(SYMBOL_NOTOK));
                } else {
                    stats.push(isDiff ? yellow(SYMBOL_PENDING) : green(SYMBOL_OK));
                }
                stats.push((counts.added > 0) ? `+${green(counts.added)}` : " ");
                stats.push((counts.removed > 0) ? `-${red(counts.removed)}` : " ");
                stats.push((counts.edited > 0) ? `±${yellow(counts.edited)}` : " ");
                stats.push((counts.renamed > 0) ? `~${magenta(counts.renamed)}` : " ");
                const itemName = bold(colourItem(path.basename(dir)));
                const line = stats;
                if (showBranch) {
                    line.unshift(formatBranchName(branch));
                }
                line.unshift(itemName);
                lines.push(line);
            });
            return formatColumns(lines);
        });
}

function formatBranchName(branch) {
    const str = branch && branch.toString() || "";
    return str.split("/").pop();
}

function getIcon() {
    const icon = frames.shift();
    frames.push(icon);
    return icon;
}

function getStats() {
    return updateStats()
        .then(() => lastStats);
}

function updateStats() {
    if (watch) {
        if (statsCanBeRefreshed !== true) {
            return Promise.resolve();
        }
        statsCanBeRefreshed = false;
        setTimeout(function() {
            statsCanBeRefreshed = true;
        }, watch * 1000);
    }
    return Promise
        .all(directories.map(dir => nodegit.Repository
            .open(dir)
            .then(repo => Promise.all([
                repo.getStatus(),
                Promise.resolve(repo.getCurrentBranch())
            ]))
            .then(([status, branch]) => [dir, status, branch])
            .catch(err => {
                return [dir, [], "", err];
            })
        ))
        .then(dirResults => {
            return dirResults.map(([dir, statuses, branch, error]) => {
                const counts = {
                    added: 0,
                    removed: 0,
                    edited: 0,
                    renamed: 0
                };
                statuses.forEach(status => {
                    if (status.isNew()) {
                        counts.added += 1;
                    }
                    if (status.isModified()) {
                        counts.edited += 1;
                    }
                    if (status.isDeleted()) {
                        counts.removed += 1;
                    }
                    if (status.isRenamed()) {
                        counts.renamed += 1;
                    }
                });
                return {
                    dir,
                    branch,
                    error,
                    counts
                };
            });
        })
        .then(mappedResults => {
            lastStats = mappedResults;
        });
}

const run = () => buildText().then(function __done(text) {
    if (watch) {
        logUpdate(text + "\n" + getIcon());
        setTimeout(run, 250);
    } else {
        logUpdate(text);
        logUpdate.done();
    }
});
run();
