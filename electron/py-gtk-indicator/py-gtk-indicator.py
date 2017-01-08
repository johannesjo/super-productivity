#!/usr/bin/python
import pygtk

pygtk.require('2.0')
import gtk
import appindicator
import os
import sys


class AppIndicator:
    def __init__(self):
        self.ind = appindicator.Indicator("example-simple-client", "indicator-messages",
                                          appindicator.CATEGORY_APPLICATION_STATUS)
        self.ind.set_status(appindicator.STATUS_ACTIVE)
        self.ind.set_attention_icon("indicator-messages-new")
        self.ind.set_icon("distributor-logo")

        # create a menu
        self.menu = gtk.Menu()

        item_show = gtk.MenuItem("Show App")
        item_show.connect("activate", self.show_app)
        item_show.show()
        self.menu.append(item_show)

        item_quit = gtk.MenuItem("Quit")
        item_quit.connect("activate", self.quit)
        item_quit.show()
        self.menu.append(item_quit)

        self.menu.show()

        self.ind.set_menu(self.menu)

        # read input from stdin to set label
        for line in sys.stdin:
            self.ind.set_label(line)

    def sent_ipc(self, message):
        os.write(1, message + '\n')

    def show_app(self, widget, data=None):
        self.sent_ipc('SHOW_APP')

    def quit(self, widget, data=None):
        self.sent_ipc('QUIT')
        gtk.main_quit()


def main():
    gtk.main()
    return 0


if __name__ == "__main__":
    indicator = AppIndicator()
    indicator.sent_ipc('TEST')
    main()
