#!/usr/bin/env node

const path = require("path");
const argv = require("minimist")(process.argv.slice(2));
const nodegit = require("nodegit");
const logUpdate = require("log-update");
const formatColumns = require("colm");
const { green, red, yellow, magenta, bold, dim, white, black, reset } = require("chalk");

const watch = (argv.w && 5) || argv.watch;
const directories = argv._.map(dir => path.resolve(process.cwd(), dir));

const frames = [
    "◴",
    "◷",
    "◶",
    "◵"
];
let text = "";

function getIcon() {
    const icon = frames.shift();
    frames.push(icon);
    return icon;
}

function doItNow() {
    return Promise
        .all(directories.map(dir => nodegit.Repository
            .open(dir)
            .then(repo => repo.getStatus())
            .then(status => [dir, status])
            .catch(err => {
                return [dir, [], err];
            })
        ))
        .then(dirResults => {
            const lines = [];
            dirResults.forEach(([dir, statuses, error]) => {
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
                const isDiff = statuses.length > 0;
                const stats = [];
                if (counts.added > 0) {
                    stats.push(`+${green(counts.added)}`);
                }
                if (counts.removed > 0) {
                    stats.push(`-${red(counts.removed)}`);
                }
                if (counts.edited > 0) {
                    stats.push(`±${yellow(counts.edited)}`);
                }
                if (counts.renamed > 0) {
                    stats.push(`~${magenta(counts.renamed)}`);
                }
                let colourItem = argv.invert ? black : white;
                let statStr = isDiff ?
                    stats.join(" ") :
                    green("✓");
                if (error) {
                    statStr = red("✘");
                    colourItem = dim;
                }
                const itemName = bold(colourItem(path.basename(dir)));
                lines.push([itemName, statStr]);
            });
            text = formatColumns(lines);
            logUpdate(text);
        });
}

const run = () => doItNow().then(function __done() {
    if (watch) {
        setTimeout(run, watch * 1000);
    } else {
        logUpdate.done();
    }
});
run();
if (watch) {
    setInterval(() => {
        logUpdate(text + "\n" + getIcon());
    }, 400);
}
