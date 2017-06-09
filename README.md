# gstat
Git repo stats reporter application for the terminal

## Installation
Install `gstat` globally:

```shell
npm install -g gstat
```

## Usage
`gstat` takes a directory or glob of directories:

```shell
gstat /somedir
# or
gstat ~/git/*
```

### Options
Certain flags can be added to the command:

 * `-w`: Watch the listed directories for changes every 5 seconds
 * `--watch=n`: Watch the listed directories for changes every **n** seconds
 * `-h`: Show headings
