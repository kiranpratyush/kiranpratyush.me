---
title: "Computer Networking Fundamentals: Part 1"
description: "Notes on networking fundamentals, from IP and MAC addresses to namespaces, bridges, routing, iptables and NAT."
publishedAt: 2026-10-10
tags:
  - Networking
  - Linux
draft: false
---

#### 1. The general idea of networking
- Networking moves data from computer A to computer B. A and B can connect directly or through other devices.
- Each layer wraps the data in a header. This is encapsulation.
- The transport header (TCP or UDP) has the source port and the destination port. A port identifies the process.
- The IP header has the source IP and the destination IP. These identify the two end hosts.
- The Ethernet header has the source MAC and the destination MAC. These identify the two ends of the current link only.
- Models such as OSI and TCP/IP divide this process into layers.

#### 2. IP addresses
- An IP address is a number on an interface. The interface uses it to communicate with the Internet Protocol.
- An IP address belongs to an interface, not to a host. A host with two interfaces can have two IP addresses.
- There are two versions:
  - IPv4 has 32 bits. We write it as four decimal numbers with dots. Example: `10.0.0.1`.
  - IPv6 has 128 bits. We write it in hexadecimal. Example: `fe80::1`.
- Public addresses are for use on the Internet.
- Private addresses are for use in private networks only (RFC 1918):
  - `10.0.0.0/8`
  - `172.16.0.0/12`
  - `192.168.0.0/16`
- The `/8` is the prefix length (CIDR notation). It tells that the first 8 bits are the network bits. The remaining 32 - 8 = 24 bits are the host bits.
- The subnet mask for `/8` is `255.0.0.0`. The prefix length and the mask give the same information.
- In `10.0.0.0/8`, the network address is `10.0.0.0`. The broadcast address is `10.255.255.255`.
- Do not give the network address or the broadcast address to a host.

#### 3. MAC addresses
- A MAC address is a 48-bit label on an interface.
- A MAC address identifies the interface on the local link only.
- An IP address identifies the interface everywhere, on the local link and across networks.
- Data moves hop by hop. Each device sends the data to the next hop only.
- The IP addresses tell the end-to-end source and destination.
- The MAC addresses tell the source and destination of the current hop.

#### 4. TCP and UDP
- TCP and UDP are transport protocols. Both use ports to identify the process.
- TCP:
  - TCP divides the byte stream into segments.
  - TCP delivers the bytes in order.
  - TCP cannot prevent packet loss. TCP finds lost segments and sends them again (retransmission).
  - TCP has flow control and congestion control.
  - Sequence numbers, ACKs and windows give these features.
- UDP:
  - UDP does not divide the data. UDP sends one datagram for each send call.
  - UDP has no handshake, no retransmission and no ordering.
  - UDP has less overhead. Thus, UDP is faster to start and lighter.
- The TCP three-way handshake:
  1. The client sends SYN with a random sequence number. Wireshark shows it as relative seq 0.
  2. The server sends SYN-ACK with its own random sequence number (relative seq 0) and ack 1.
  3. The client sends ACK with seq 1 and ack 1. Then the client starts to send data.
- A sequence number counts bytes, not packets.
- The ACK number is the next byte that the receiver expects.
- A SYN uses one sequence number. Thus, the reply to seq 0 is ack 1.
- The handshake only syncs the start sequence numbers of the two sides.

#### 5. How to do subnetting (VLSM)
1. For each network, count the hosts.
2. Add 1 for the gateway if the network connects to a router.
3. Add 2 for the network address and the broadcast address.
4. Find the smallest n where the total ≤ 2^n. The prefix length is 32 - n.
5. Sort the networks by size, from the largest to the smallest.
6. Give addresses to the largest network first.
7. Start each block at a multiple of its own size. Example: a /26 can start at .0, .64, .128 or .192. It cannot start at .32.
- A link between two routers needs a /30 (2 usable addresses). A /31 also works on a point-to-point link (RFC 3021).

#### 6. Linux network namespace
- A network namespace is an isolated instance of the network stack.
- It has its own:
  - interfaces
  - route tables
  - ARP (neighbor) table
  - iptables rules
  - sockets and ports
  - sysctls, such as `ip_forward`
- A new namespace does not copy the host stack. It starts empty. It has only `lo`, and `lo` is down.

#### 7. veth pair
- A veth pair is a virtual Ethernet cable with two ends. Each end is an interface.
- A frame that goes into one end comes out of the other end.
- The two ends can be in different namespaces. This connects the namespaces.

#### 8. Bridge
- A Linux bridge is a virtual switch. It works at layer 2.
- A bridge moves frames, not packets.
- A bridge learns a table of MAC address to port.
- A bridge floods broadcast frames and frames to unknown MAC addresses to all ports.
- A bridge connects devices in the same layer-2 segment (broadcast domain).
- A bridge does not need an IP address to switch frames.
- You can give the bridge interface an IP address. Then the host can use the bridge as a gateway. Example: Docker gives `docker0` the address `172.17.0.1`.

#### 9. Linux interface
- An interface is an object in the kernel. It represents a network device.
- An interface can be physical, such as an Ethernet card.
- An interface can be virtual, such as `lo`, a veth end or a bridge.

#### 10. Route table
- The route table tells where to send a packet for a given destination.
- Each route has a destination prefix and a next hop.
- The next hop is an IP address (`via`) and an interface (`dev`).
- A connected route has no `via`. Example: `10.0.0.0/24 dev veth0`. The destination is on the same link. The host sends ARP for the destination itself.
- If many routes match, the route table uses the longest prefix match. The most specific route wins.
- The gateway IP never goes into the packet. The host uses the gateway IP only to find the gateway MAC with ARP.

#### 11. Default route
- The default route is `0.0.0.0/0`.
- `/0` is the shortest prefix. It matches all destinations.
- Thus, the default route is used only when no other route matches.
- If no route matches and there is no default route, the result is "Network is unreachable". The host sends no packet.

#### 12. iptables
- iptables filters and changes packets.
- iptables has tables:
  - `filter`: accept or drop packets.
  - `nat`: change addresses and ports.
  - `mangle`: change other packet fields.
  - `raw`: settings before connection tracking.
- Each table puts its chains on some of the five hooks:
  - PREROUTING: the packet just came in. The routing decision did not occur yet.
  - INPUT: the destination of the packet is this device.
  - FORWARD: the packet goes through this device to another device.
  - OUTPUT: this device made the packet.
  - POSTROUTING: the packet is about to go out.

#### 13. NAT types
- SNAT:
  - SNAT changes the source address.
  - Use it when traffic goes out of a private network.
  - It is in the POSTROUTING chain.
  - SNAT writes a fixed IP that you give it.
- MASQUERADE:
  - MASQUERADE is a type of SNAT.
  - It uses the current IP of the outgoing interface.
  - Use it when the outgoing IP can change, for example with DHCP.
- DNAT:
  - DNAT changes the destination address and port.
  - Use it for port forwarding.
  - It is in the PREROUTING chain.

#### 14. How a packet moves from end to end
1. The host makes an IP packet with the source IP and the destination IP.
2. The host looks in its route table for the destination. It uses the longest prefix match.
3. If the route has a `via`, the next hop is the gateway. If not, the next hop is the destination itself.
4. The host looks in its ARP cache for the MAC of the next hop.
5. If the MAC is not in the cache, the host sends an ARP request.
6. The host puts the IP packet in an Ethernet frame. The frame has the host MAC as source and the next-hop MAC as destination.
7. The host sends the frame on the link.
8. The router receives the frame. It removes the old Ethernet header.
9. The router decreases the TTL by 1. The IP addresses do not change (except with NAT).
10. The router forwards only when `ip_forward=1`.
11. The router repeats steps 2 to 7 with its own route table.
12. The reply must also have a route back to the source.
