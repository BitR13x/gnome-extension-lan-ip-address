# gnome-extension-lan-ip-address

This is the code behind the GNOME Shell Extension called [**LAN IP Address**](https://extensions.gnome.org/extension/1762/lan-ip-address/).

![icon showing 192.168.](icon.png)

## Impetus

I specifically made this extension because I couldn't find an extension in the store that met my needs. Often I have multiple IP addresses on my Linux workstation, especially when using Docker, and this would seem to confuse any of the other similar extensions. The only address I want to see in my top panel is my machine's true (i.e. routable) LAN IP address, the one you would use if you were to SSH to your machine on the LAN.

## Privacy

This extension also respects your privacy and bandwidth, as it makes absolutely zero requests to the Internet and sends zero packets to the Internet. The plugin gets its information from your local routing table (from the output of `ip route`) and only displays the result in the GNOME panel, and this information never leaves your computer.

## How it works - in detail

Completely reworked the initial fork and now only scrapping the `ifconfig` command.

```sh
ifconfig wlan0
```

## Install

```sh
git clone https://github.com/BitR13x/gnome-extension-lan-ip-address.git \
~/.local/share/gnome-shell/extensions/gnome-extension-lan-ip-address.git

cd ~/.local/share/gnome-shell/extensions/gnome-extension-lan-ip-address.git

glib-compile-schemas ./schemas/
```

A shell reload is required `Alt+F2` r Enter and extension has to be enabled with gnome-tweak-tool.

## Usage

Left-Clicking on the display interface is going to switch the interface to another, Right clicking is going to copy the ip address.

## Scope

**What if you want to see your WAN IP address, too?** This is out of scope for this simple extension. This extension by design only shows your internal LAN IP address, just as the name suggests. It is designed for developers and other engineers who only need to see their LAN address in a convenient place, and with total privacy (no calls to the Internet). If you actually want your WAN IP address or IPv6 addresses, check out this extension instead: [All IP Addresses](https://extensions.gnome.org/extension/3994/all-ip-addresses/)

## Known limitations

- In the atypical case that you are working on a LAN not connected to the Internet (such as an isolated lab), you have no route that could reach `1.1.1.1`, so things will not work the way this extension is currently designed.
