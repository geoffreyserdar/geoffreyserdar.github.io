# Lake chart

One old-style chart of Lake Minnetonka. Bay water and town names link to pages that already exist. A tap highlights the water. The current page is marked with a cream tag reading “You are here,” in bold rust, sitting beside that bay or town with a short pointer. The tag stays large enough to read on a phone, flips to the open parchment, and sits clear of the other names. A sale pin is optional, and only for a page that has a sale.

The drawing waits until the chart is near the screen. With JavaScript off, the image inside the figure stays.

The plate is the parchment ground, the dark green frame with tick marks, the title cartouche, the compass, the scale of miles, and the small bay names that are not links. Those names are decoration. Only the bays and towns in the list below can be tapped.

## Drop it on a page

Paste `include.html` once, where the chart should sit. Change `data-here` to this page. Set `data-focus` to `bays` on a bay page and `towns` on a town page. Leave `data-focus` off on a guide. Bay pages open with the bay names strong and the town names quiet. Town pages open the other way. Zooming in brings the quiet names back up, and then the smaller bays.

```html
<figure class="lake-chart" data-here="wayzata" aria-label="Chart of Lake Minnetonka. Map data © OpenStreetMap contributors.">
```

`data-here` must be one of the ids below. Leave it off on a page that is not a bay or a town, such as the bays guide or the weekly page.

`data-lake` chooses the drawing. It defaults to `minnetonka`, which loads `/assets/lake-chart/lake-minnetonka-chart.svg`. Another lake later is a new SVG that uses the same classes (`bay`, `town`, `minor`, `other`) plus `data-here` and the optional pin on each page.

Zoomed out, the chart shows towns and the large bays. A pinch zooms toward the point between the fingers. The scroll wheel zooms toward the cursor. The + and − buttons zoom toward the center of the map window. Reset, or zooming all the way out, restores the whole lake. With the chart at full size, one finger scrolls the page. Once it is zoomed, one finger pans and two fingers pinch. The point under the fingers stays put, and the lake stays inside the frame. The hint fades after the first zoom.

## Optional sale pin

Add these on a page that has a sale. The numbers are positions on the chart, from 0 0 to 800 860. Leave them off everywhere else.

```html
<figure class="lake-chart" data-here="wayzata-bay"
  data-pin-x="652.8" data-pin-y="238"
  data-pin-addr="2670 Woolsey Lane" data-pin-town="Woodland"
  data-pin-sold="Nov 2, 2026" data-pin-price="$6,227,200">
```

## Ids that link

Bays: `wayzata-bay`, `upper-lake`, `browns-bay`, `crystal-bay`, `carsons-bay`, `st-albans`, `smithtown-bay`.

Towns: `wayzata`, `woodland`, `minnetonka-beach`, `orono`, `mound`, `spring-park`, `minnetrista`, `excelsior`, `greenwood`, `shorewood`, `deephaven`, `tonka-bay`, `victoria`.

Halsted Bay, the smaller bays, Libbs Lake, and Lake Minnewashta are drawn as names only. They have no page, so they are not links. Lake Minnewashta is its own lake, southwest of Excelsior. Do not invent a new id.

Under the chart, `On this map` is real HTML: a link where a page exists, plain text where it does not. The same block carries schema.org for Lake Minnetonka, Lake Minnewashta, and the bays, using OpenStreetMap coordinates only. Each bay or town page points its own place at `https://geoffreyserdar.com/#agent`.
