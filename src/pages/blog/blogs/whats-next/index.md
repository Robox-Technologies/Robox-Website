# So You’ve Finished Your Robox Kit 🎉

Congrats! As author Nicholas Sparks once said, *“Nothing worthwhile is ever easy.”*

Now, some of you might already be asking, *“What do I do next?”*  
This guide will walk you through the next steps to make sure your Robox kit is ready for action.

---

## 1. Check if All the Lights Are On

First, make sure these components light up:

- **Pico**
- **Motor Driver**  
  ![The Pico and Motor driver light](@images/blogs/whats-next/picoandmotordriver.jpeg)
- **Light Sensors** (only light up when you cover them)  
  ![Light sensor](@images/blogs/whats-next/lightsensor.jpeg)

If they all light up, great! You’ve successfully wired your Robox kit.  

If **none** of them light up, double-check your wiring against the [guide](https://robox.com.au/public/latest.pdf). If **all** of them stay off, it usually means the positive and negative wires are reversed.

---

### How to Fix Reversed Wiring

**Don’t panic.**  
We’ve chosen durable components, and I’ve personally reversed wiring more times than I can count, nothing’s ever broken (touch wood).

Here’s what to do:

1. **Disconnect the USB** from the Pico.
2. **Wait 1–2 minutes** before touching any components. When a short occurs, parts can get hotter than normal and might burn you.
3. **Reconnect the USB** after checking the wiring. If the lights come on, you’re good to go.

If it’s still not working, remove components one at a time in this order, testing the Pico after each removal:

1. Ultrasonic sensor
2. Line sensors
3. Colour sensors
4. Motor driver (at this point, only the Pico light should be on)
5. Finally, the Pico itself

When the lights return, the last part you removed is likely the problem.  

If nothing works after all this, contact us at [hello@robox.com](mailto:hello@robox.com).

---

## 2. Flashing the Robox

Once all the lights are on, the next step is to **flash** the Robox.

You’ll need:

- USB-C cable
- Computer
- [The latest UF2 file](https://robox.com.au/public/latest.uf2)

**Steps:**

1. Find the **BOOTSEL button** on your Robox kit.
2. Hold the BOOTSEL button down **while** plugging the Robox into your computer.
3. If done correctly, a USB device should appear on your computer.
   - **If it doesn’t appear:** Your cable might only be for charging, not data transfer. Try another cable.
   - **If it does appear:** Drag the UF2 file into the device.  
     The Robox will disconnect automatically once flashing is done.

For more detail, see the [Raspberry Pi Foundation guide](https://projects.raspberrypi.org/en/projects/getting-started-with-the-pico/3).

---

## 3. Calibrating the Line Sensors

Before coding, you’ll need to **calibrate the line sensors**.

We try to pre-calibrate before shipping, but lighting and surfaces vary.

You’ll need:

- Flathead screwdriver
- A surface with **black** and **white** areas

**Why calibrate?**  
The line sensors detect black and white differently depending on lighting conditions.

**How to calibrate:**

1. Focus on **one sensor** at a time (e.g., the left sensor).
2. Use the screwdriver to turn the potentiometer all the way to one side.
   - At one extreme, it will detect **everything** as white (LED on).
   - At the other, it will detect **everything** as black (LED off).
3. Slowly turn the potentiometer until:
   - Over white → LED **on**
   - Over black → LED **off**
4. Repeat for the other sensor.

The “sweet spot” is when the LED switches instantly as you move between black and white.

---

## 4. Calibrating the Colour Sensor

Now head over to the [Student Hub](https://robox.com.au/student/) and create a project.  
We’ll cover coding in later articles, but for now:

1. Click the **cog icon** in the top-left corner.
2. Select **Calibrate Colour**.
3. Follow the on-screen prompts.
["Calibration"](@images/blogs/whats-next/calibratecolour.png)


This process is much simpler than line sensor calibration.

---

## Conclusion

And that’s it your Robox kit is ready!  
Explore the editor, write some Python, experiment with the sensors, and most importantly **have fun**.

\- Seb
