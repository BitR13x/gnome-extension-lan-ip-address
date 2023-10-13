"use strict";

const Main = imports.ui.main;
const Mainloop = imports.mainloop;

const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Me = imports.misc.extensionUtils.getCurrentExtension();

/*
DEBUG: dbus-run-session  -- gnome-shell --nested --wayland
export MUTTER_DEBUG_DUMMY_MODE_SPECS=1366x768

Detailed message output:
export G_MESSAGES_DEBUG=all
*/

function getSchemaObj(name) {
  let GioSSS = Gio.SettingsSchemaSource;
  let schemaSource = GioSSS.new_from_directory(
    Me.dir.get_child("schemas").get_path(),
    GioSSS.get_default(),
    false
  );
  let schemaObj = schemaSource.lookup(name, true);
  if (!schemaObj) throw new Error("Cannot find schema");
  return schemaObj;
}

const settings = new Gio.Settings({
  settings_schema: getSchemaObj("org.gnome.shell.extensions.lan-ip-address"),
});

function _decode_string(input_bytes) {
  /* Decode function for byte string: command_output_bytes */
  var command_output_string = "";

  for (
    var current_character_index = 0;
    current_character_index < input_bytes.length;
    ++current_character_index
  ) {
    var current_character = String.fromCharCode(
      input_bytes[current_character_index]
    );
    command_output_string += current_character;
  }

  return command_output_string;
}

function _get_interfaces() {
  var command_output_bytes = GLib.spawn_command_line_sync("ifconfig")[1];
  var command_output_string = _decode_string(command_output_bytes);

  // Split the output into sections for each network interface
  const interfaceSections = command_output_string.split("\n\n");

  // Parse and extract the interface names
  const interfaces = interfaceSections
    .map((section) => {
      const lines = section.split("\n");
      const interfaceName = lines[0].split(" ")[0].slice(0, -1);
      return interfaceName;
    })
    .filter((name) => name.trim() !== "");
  //console.log("Network Interfaces:");
  //console.log(interfaces);
  return interfaces;
}

function _get_lan_ip(ip_interface) {
  var command_output_bytes = GLib.spawn_command_line_sync(
    `ifconfig ${ip_interface}`
  )[1];
  var command_output_string = _decode_string(command_output_bytes);

  const lines = command_output_string.split("\n");
  const inetLine = lines.find((line) => line.includes("inet "));

  if (inetLine) {
    const match = inetLine.match(/inet (\S+)/);
    if (match) {
      const ipAddress = match[1];
      return `${ip_interface}: ${ipAddress}`;
    }
  } else {
    return `No IP address: ${ip_interface}`;
  }
}

function copyToClipboard(text) {
  const clipboard = St.Clipboard.get_default();
  clipboard.set_text(St.ClipboardType.CLIPBOARD, text);
}

// Our PanelMenu.Button subclass
var LanIPAddressIndicator = class LanIPAddressIndicator extends PanelMenu.Button {
  _init() {
    // Chaining up to the super-class
    super._init(0.0, "LAN IP Address Indicator", false);
    this.interfaces = _get_interfaces();
    this.interface_index = 0;
    let loadedInterface = settings.get_string("ip-interface");
    if (loadedInterface) {
      for (let i = 0; i < this.interfaces; i++) {
        if (this.interfaces[i] == loaded) this.interface_index = i;
      }
    }

    this.buttonText = new St.Label({
      text: "Loading...",
      y_align: Clutter.ActorAlign.CENTER,
    });
    this.add_child(this.buttonText);
    this._updateLabel();
    this.connect("event", this._onClicked.bind(this));
  }

  _updateLabel() {
    const refreshTime = 5; // in seconds

    if (this._timeout) {
      Mainloop.source_remove(this._timeout);
      this._timeout = null;
    }

    this._timeout = Mainloop.timeout_add_seconds(refreshTime, () => {
      this._updateLabel();
    });

    this.buttonText.set_text(
      _get_lan_ip(this.interfaces[this.interface_index])
    );
  }

  _onClicked(actor, event) {
    if (
      event.type() !== Clutter.EventType.TOUCH_BEGIN &&
      event.type() !== Clutter.EventType.BUTTON_PRESS
    ) {
      // Some other non-clicky event happened; bail
      return Clutter.EVENT_PROPAGATE;
    }
    if (event.get_button() === Clutter.BUTTON_SECONDARY) {
      copyToClipboard(this.buttonText.text.split(" ")[1]);
    } else {
      this.interface_index += 1;
      if (this.interface_index >= this.interfaces.length) {
        this.interface_index = 0;
      }
      this._updateLabel();

      settings.set_string(
        "ip-interface",
        this.interfaces[this.interface_index]
      );
    }
  }

  stop() {
    if (this._timeout) {
      Mainloop.source_remove(this._timeout);
    }
    this._timeout = undefined;

    this.menu.removeAll();
  }
};

// In gnome-shell >= 3.32 this class and several others became GObject
// subclasses. We can account for this change simply by re-wrapping our
// subclass in `GObject.registerClass()`
LanIPAddressIndicator = GObject.registerClass(
  { GTypeName: "LanIPAddressIndicator" },
  LanIPAddressIndicator
);

let _indicator;

function enable() {
  _indicator = new LanIPAddressIndicator();
  Main.panel.addToStatusArea("lan-ip-address-indicator", _indicator);
}

function disable() {
  _indicator.stop();
  _indicator.destroy();
  _indicator = null;
}
