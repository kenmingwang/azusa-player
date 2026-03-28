import { Navigation, Script } from "scripting";

import { AzusaPoCApp } from "./lib/app";

async function run() {
  await Navigation.present({
    element: <AzusaPoCApp />,
  });

  Script.exit();
}

void run();
