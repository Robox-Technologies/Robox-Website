# Controller mode: board behaviour

Handoff for the firmware side. The website's controller page
(`/controller`) is built and tested against the behaviour described here; the
board's controller loop needs to match it.

- Wire format: [`src/features/controller/protocol/packets.ts`](../src/features/controller/protocol/packets.ts)
- Host link (what the page sends and when): [`src/features/controller/protocol/controllerLink.ts`](../src/features/controller/protocol/controllerLink.ts)
- Shared test vectors: [`src/features/controller/__tests__/vectors/controller.json`](../src/features/controller/__tests__/vectors/controller.json) — copy these into the firmware tests; both sides must pass them.

---

## Summary

1. The host sends a normal framed `COMMAND` with the payload `controller_mode`.
2. The board answers with a normal framed REPLY of type `controller_mode`,
   then leaves the framed protocol and runs a tight controller loop that reads
   fixed 6-byte packets from the UART.
3. On that reply, the host switches to raw mode.
4. The host streams DRIVE packets (left/right speed). The board sets the motors.
5. If no valid packet arrives for **500 ms**, the board sets the motors to 0
   and leaves controller mode.
6. On EXIT, the board does the same.

The link is one-way: in controller mode the board sends **nothing** back.

The motors must **never** keep running because the board stopped hearing from
the host. Every way out of controller mode ends with the motors stopped.

---

## Entering controller mode

- Trigger: a framed `COMMAND` (`Kind.COMMAND`, `'X'`) whose payload is exactly
  `controller_mode`, sent while the board is idle (connected, no program running).
- If the board can switch, it sends a framed REPLY
  `{"type": "controller_mode", "message": "ready"}` (the message is ignored) and
  switches right after that frame has gone out. The host stays on the framed
  protocol until it sees this reply, so it must be the board's **last** framed
  message.
- If it can't (e.g. a program is running), it sends a normal framed `error`
  reply with a short reason and stays in the framed protocol. The page shows
  the reason.
- No reply within **1.5 s** and the host gives up and stays framed.
- From then on the board must not send anything on the UART: no framed
  traffic, log lines, or `print` output.
- Motors start at zero on entry.

## Packet format

Every packet is exactly 6 bytes, host → board:

| Byte | Field   | Notes                                                    |
| ---- | ------- | -------------------------------------------------------- |
| 0    | `start` | Always `0xA5`                                            |
| 1    | `type`  | See table below                                          |
| 2    | `seq`   | 0–255, wraps. Informational only                         |
| 3    | `a`     | Meaning depends on `type`                                |
| 4    | `b`     | Meaning depends on `type`                                |
| 5    | `crc`   | CRC-8 over bytes 1–4 (`type`, `seq`, `a`, `b`)           |

**CRC-8:** polynomial `0x07`, init `0x00`, no reflection, no final XOR
(CRC-8/SMBUS). Check value: `crc8(b"123456789") == 0xF4`.

| Type   | Name  | `a`                   | `b`                    | Board does                                       |
| ------ | ----- | --------------------- | ---------------------- | ------------------------------------------------ |
| `0x01` | DRIVE | left speed, int8      | right speed, int8      | Set both motors                                  |
| `0x04` | EXIT  | 0                     | 0                      | Motors to 0, leave controller mode               |
| `0x10`–`0x1F` | reserved (AUX) | output id | value         | Ignore for now                                   |

Speeds are two's-complement int8 in **-100..100** (percent of full speed,
positive = forward). Clamp anything outside that range to ±100 rather than
rejecting the packet. Speeds go straight to the motors: deadzone, expo,
arcade mixing and the max-speed limit are already applied on the host.
Motor calibration the board already applies (bias, reversed/swapped motors)
should still apply in controller mode.

Any other type with a valid CRC: ignore it (it still resets the timeout).

## Receiving

The board must parse a byte stream, not assume packets arrive aligned:

- Scan for `0xA5`. If fewer than 6 bytes are buffered, wait for more.
- If the CRC doesn't match, drop **one byte** (the `0xA5`) and scan again —
  don't drop all 6, or a real packet starting inside the bad one is lost.
- BLE delivers in chunks (HM-10, 20 bytes), so a packet can be split across
  reads and several packets can arrive in one read.
- Only packets with a valid CRC reset the timeout.

Don't reject duplicate or out-of-order `seq` values, and don't try to detect
gaps — DRIVE is latest-value-wins.

## Timeout

- **500 ms** without a valid packet → motors to 0 and leave controller mode,
  exactly as for EXIT.
- The host keeps it fed: DRIVE is re-sent at least every **100 ms** even when
  the value hasn't changed. So a timeout means ~5 lost packets in a row, i.e.
  a real link problem.
- This also covers a dropped BLE/USB link (the reconnecting page talks framed)
  and reaching the bootloader (framed `BOOTLOADER` works once the page has
  gone away). Bytes that aren't valid packets — including framed commands —
  don't reset the timer.
- The control loop should apply a DRIVE within one loop iteration of reading
  it. Aim for the loop to run every few ms; anything over ~20 ms per iteration
  will be felt as lag.

## Leaving controller mode

| Cause                                       | Board does                                                     |
| ------------------------------------------- | -------------------------------------------------------------- |
| EXIT received                               | Motors to 0, return to the framed protocol, ready for commands |
| Host sends DRIVE 0 0 then EXIT (page close) | Same as above — the zero DRIVE is just sent first so the motors halt even if EXIT is lost |
| 500 ms without a valid packet               | Same as above                                                  |

After EXIT the host immediately treats the link as framed again, so the board
should be parsing frames by the time the next framed command could arrive.

## Host behaviour worth knowing

So the board side isn't surprised:

- Controller mode ships in the same firmware release as everything else, so
  there's no separate controller version: the normal firmware check on connect
  is the only gate. If the page lets you connect, the board must support
  controller mode. Any change to this protocol ships as a normal firmware
  release alongside the matching website change.
- Emergency stop on the page sends DRIVE 0 0 ahead of anything queued, then holds
  the output at zero until every input is released.
- Hiding the tab or switching apps sends DRIVE 0 0.
- At most one packet is ever in flight; a newer DRIVE replaces an unsent one,
  so the board never sees a backlog of stale speeds. Bandwidth is at most 50
  packets/s (20 ms apart) = 300 B/s, well under the HM-10's ~960 B/s.
- The host can't tell when the board has timed out, since the board sends
  nothing back. It keeps streaming until the user leaves the page or the
  BLE/USB link itself drops.

## Test vectors

`controller.json` has the CRC checks and the exact bytes for DRIVE (forward,
reverse, pivot, zero) and EXIT. For example:

```
DRIVE seq=0 left=60 right=60     a5 01 00 3c 3c a7
DRIVE seq=1 left=-60 right=-60   a5 01 01 c4 c4 96
```

Run the same file in the firmware's decoder tests.
