# Alpine Linux Files

This directory should contain the Alpine Linux filesystem for v86:

- `alpine-fs.json` - Filesystem metadata
- `alpine-rootfs-flat/` - Directory with SHA256-named files

## Setup

Option 1: Build from scratch

```bash
cd alpine-guest
./build.sh
# Then use v86's tools to convert the rootfs
```

Option 2: Use v86's Docker tooling

```bash
git clone https://github.com/copy/v86.git
cd v86/tools/docker/alpine
docker-compose up
```

See https://github.com/copy/v86 for detailed instructions.
