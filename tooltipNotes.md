Predictions may have a free-text `status`. If present, we recommend displaying this directly to riders wherever you display an arrival or departure time, and if possible in place of the arrival or departure time, since it may indicate a situation that affects the accuracy of the prediction (e.g. a train stopped unexpectedly between stations). Status strings are English-language and have no maximum length, though they are typically kept short for display on signage.

Predictions, as well as schedules, may include an `arrival_time`, a `departure_time`, both, or (only for predictions) neither. The rules for when a time is present are simple:

The departure time is present if, and only if, it's possible for riders to board the associated `vehicle` at the associated `stop`. A null departure time is typically seen at the last stop on a trip.
The arrival time is present if, and only if, it's possible for riders to alight from the associated `vehicle` at the associated `stop`. A null arrival time is typically seen at the first stop on a trip.
In general we recommend not displaying predictions with null departure times, since riders will not be able to board the vehicle. If both arrival and departure time are present, the arrival time is likely to be more useful to riders.

Predictions with neither an arrival time nor a departure time indicate the vehicle will not make the scheduled stop. The `schedule_relationship` field may explain why.

---

From Zeroheight

The content of the tooltip will change slightly depending on the mode, for example:

Bus

Harvard via Allston bus is on the way to Harvard St opp Verndale St

Subway

Ashmont train is on the way to Broadway

Commuter Rail

Greenbush train 1085 is on the way to JFK/UMass