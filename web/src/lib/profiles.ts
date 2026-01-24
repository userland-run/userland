export interface Profile {
  id: string;
  name: string;
  description: string;
  packages: string[];
  script: string;
}

export const BUILTIN_PROFILES: Profile[] = [
  {
    id: 'nodejs-22',
    name: 'Node.js 22',
    description: 'Node.js runtime with npm',
    packages: ['nodejs', 'npm'],
    script: `
node --version
npm --version
    `.trim(),
  },
  {
    id: 'python3',
    name: 'Python 3',
    description: 'Python interpreter with pip',
    packages: ['python3', 'py3-pip'],
    script: `
python3 --version
pip3 --version
    `.trim(),
  },
  {
    id: 'devtools',
    name: 'Dev Tools',
    description: 'GCC, Make, Git, and other build essentials',
    packages: ['build-base', 'git', 'curl', 'wget'],
    script: `
gcc --version
git --version
    `.trim(),
  },
  {
    id: 'rust',
    name: 'Rust',
    description: 'Rust compiler and Cargo',
    packages: ['rust', 'cargo'],
    script: `
rustc --version
cargo --version
    `.trim(),
  },
  {
    id: 'go',
    name: 'Go',
    description: 'Go programming language',
    packages: ['go'],
    script: `
go version
    `.trim(),
  },
];

export function generateApplyScript(profile: Profile): string {
  return `#!/bin/sh
set -e

# Profile: ${profile.name}
# Description: ${profile.description}
# Packages: ${profile.packages.join(', ')}

echo "==> Installing packages for profile: ${profile.name}"
apk add --no-cache ${profile.packages.join(' ')}

echo "==> Running verification..."
${profile.script}

echo "==> Profile '${profile.name}' applied successfully!"
`;
}

export function generateRemoveScript(profile: Profile): string {
  return `#!/bin/sh
set -e

echo "==> Removing packages for profile: ${profile.name}"
apk del ${profile.packages.join(' ')} || true

echo "==> Profile '${profile.name}' removed."
`;
}
