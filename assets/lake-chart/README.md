# Lake chart

One old-style chart of Lake Minnetonka. Bay water and town names link to pages that already exist. A tap highlights the water. The current page is marked “You are here.” A sale pin is optional, and only for a page that has a sale.

The drawing waits until the chart is near the screen. With JavaScript off, the image inside the figure stays.

## Drop it on a page

Paste `include.html` once, where the chart should sit. Change `data-here` to this page.

```html
<figure class="lake-chart" data-here="wayzata" aria-label="Chart of Lake Minnetonka. Map data © OpenStreetMap contributors.">
```

`data-here` must be one of the ids below. Leave it off on a page that is not a bay or a town, such as the bays guide or the weekly page.

## Optional sale pin

Add these on a page that has a sale. The numbers are positions on the chart, from 0 0 to 800 640. Leave them off everywhere else.

```html
<figure class="lake-chart" data-here="wayzata-bay"
  data-pin-x="652.8" data-pin-y="238"
  data-pin-addr="2670 Woolsey Lane" data-pin-town="Woodland"
  data-pin-sold="Nov 2, 2026" data-pin-price="$6,227,200">
```

## Ids that link

Bays: `wayzata-bay`, `upper-lake`, `browns-bay`, `crystal-bay`, `carsons-bay`, `st-albans`, `smithtown-bay`.

Towns: `wayzata`, `woodland`, `minnetonka-beach`, `orono`, `mound`, `spring-park`, `minnetrista`, `excelsior`, `greenwood`, `shorewood`, `deephaven`, `tonka-bay`, `victoria`.

Halsted Bay and Gray’s Bay are drawn as plain names. They have no page, so they are not links. Do not invent a new id.
