# Why inkthread's viewer looks the way it does

## The obvious version

Draw the graph, colour it nicely, show a tooltip. A knowledge graph of a document then becomes a hairball
of labels you cannot check against anything.

## Why I built it differently

The point of inkthread is that every thread can be checked against the page, so the page is always on
screen. Selecting a part draws its region on the rendered page and highlights the exact words each
thread rests on. Those words, and every other verbatim string, are set in a serif; everything inkthread
says about them is set in mono. You can tell what the document says from what the machine says without
reading a legend. Colour is spent once: one validated hue per thread family, with shape and line style as
the second channel for colour-blind readers.

## What I'd change

The 3D view is beautiful but imprecise on dense documents; the 2D map is the honest one. I would add
community clustering to the 2D map and let the 3D view follow the camera to the page's section as you
scroll the page.
