FROM amd64/alpine:3.21.0

# Core system
RUN apk add --no-cache \
    openrc \
    alpine-base \
    linux-virt \
    util-linux \
    e2fsprogs

# Serial console auto-login
RUN sed -i 's/^tty1/#tty1/' /etc/inittab && \
    echo "ttyS0::respawn:/sbin/getty -L ttyS0 115200 vt100" >> /etc/inittab

# Enable services
RUN rc-update add devfs sysinit && \
    rc-update add dmesg sysinit && \
    rc-update add hwclock boot && \
    rc-update add modules boot && \
    rc-update add networking boot

# Generate initramfs with 9p support (base feature includes busybox)
RUN mkinitfs -F "base virtio 9p" $(ls /lib/modules)
