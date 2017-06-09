#!/usr/bin/env node

const path = require("path");
const argv = require("minimist")(process.argv.slice(2));
const nodegit = require("nodegit");
const logUpdate = require("log-update");
const formatColumns = require("colm");
const { green, red, yellow, magenta, bold, dim, white, black, underline } = require("chalk");

const headings = !!argv.h;
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
            if (headings) {
                lines.push([
                    "Directory", "Clean+Repo", "Add", "Del", "Mod", "Rn"
                ].map(item => underline(item)));
            }
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
                if (error) {
                    stats.push(red("✘"));
                } else {
                    stats.push(isDiff ? " " : green("✓"));
                }
                stats.push((counts.added > 0) ? `+${green(counts.added)}` : " ");
                stats.push((counts.removed > 0) ? `-${red(counts.removed)}` : " ");
                stats.push((counts.edited > 0) ? `±${yellow(counts.edited)}` : " ");
                stats.push((counts.renamed > 0) ? `~${magenta(counts.renamed)}` : " ");
                const colourItem = argv.invert ? black : white;
                const itemName = bold(colourItem(path.basename(dir)));
                lines.push([itemName, ...stats]);
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
