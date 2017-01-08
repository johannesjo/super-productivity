#!/usr/bin/python
import pygtk

pygtk.require('2.0')
import gtk
import appindicator
import os


class AppIndicator:
    def __init__(self):
        self.ind = appindicator.Indicator("example-simple-client", "indicator-messages",
                                          appindicator.CATEGORY_APPLICATION_STATUS)
        self.ind.set_status(appindicator.STATUS_ACTIVE)
        self.ind.set_attention_icon("indicator-messages-new")
        self.ind.set_icon("distributor-logo")

        # create a menu
        self.menu = gtk.Menu()

        item = gtk.MenuItem("Quit")
        item.connect("activate", self.quit)
        item.show()
        self.menu.append(item)

        self.menu.show()

        self.ind.set_menu(self.menu)
        self.sentIpc('TEST')

    def sentIpc(self, message):
        os.write(1, message + '\n')

    def quit(self, widget, data=None):
        self.sentIpc('QUIT')
        gtk.main_quit()


def main():
    os.write(3, "TEST")
    gtk.main()
    return 0


if __name__ == "__main__":
    indicator = AppIndicator()
    indicator.sentIpc('TEST')
    main()
