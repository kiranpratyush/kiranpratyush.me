---
title: "DNS: How a Name Becomes an Address"
description: "Notes on DNS: the hierarchy, zones and records, how resolution works, and why caching makes it scale."
publishedAt: 2026-10-18
tags:
  - Networking
  - DNS
draft: false
---

#### 1. The problem

Computers talk using IP addresses, and humans remember names. DNS is a distributed database that maps names to records: IP addresses, mail servers, aliases, and verification text.

No single server could hold every name on the internet or answer every query. So DNS splits the namespace into a tree and **delegates** each branch to whoever owns it. Everything else follows from that one decision.

#### 2. The hierarchy

Read a name right to left. `www.example.com.` actually ends with a dot, which represents the root.

- **Root servers** don't know where example.com is. They only know which servers handle each TLD: `.com`, `.org`, `.in`. There are 13 root identities (a–m), each anycast across hundreds of machines worldwide.
- **TLD servers** for `.com` don't know example.com's IP either. They know which nameservers are authoritative for example.com.
- **Authoritative nameservers** for example.com hold the actual records. This is where the answer lives.

Each level only knows the next hop. No server knows everything, and none needs to.

#### 3. Zones: the unit of delegation

A **domain** is a branch of the name tree: example.com and everything under it. A **zone** is the part of that branch managed by one set of authoritative servers.

Usually they're the same thing. They differ when a branch is handed off. If example.com delegates `dev.example.com` to another team's nameservers, dev becomes its own zone, and the example.com zone stops there. That boundary is a **zone cut**, and NS records mark every cut. So the hierarchy is really a chain of zones: root zone → com zone → example.com zone.

The top of a zone is its **apex**: the zone's own name, written `@`. The apex must hold the zone's **SOA** (exactly one per zone) and its **NS** records.

An authoritative server stores each zone as a **zone file**:

```
$TTL 3600
@     SOA   ns1.example.com. admin.example.com. (
            2026101801 ; serial
            7200       ; refresh
            900        ; retry
            1209600    ; expire
            300 )      ; negative-cache TTL
@     NS    ns1.example.com.
@     NS    ns2.example.com.
ns1   A     203.0.113.10
ns2   A     203.0.113.11
@     A     93.184.216.34
www   CNAME @
@     MX    10 mail.example.com.
mail  A     93.184.216.40
@     TXT   "v=spf1 mx -all"
```

#### 4. The records

Each line in the file above is a record.

- **SOA**: the zone's metadata. It holds the primary nameserver, the admin email (the first dot stands for @), and a serial number that secondary servers check to see if the zone changed. It also sets the refresh, retry, and expire timers that control how secondaries sync, and the negative-cache TTL, which is how long a "this name doesn't exist" answer is cached.
- **NS**: which servers are authoritative for this zone. In the *parent* zone, NS records are the delegation itself. The .com zone's NS records for example.com are what point resolvers here.
- **A / AAAA**: name → IPv4 / IPv6 address.
- **CNAME**: this name *is* another name. A resolver that hits a CNAME restarts the lookup at the target, for every record type. Two rules follow from that:
  - A name with a CNAME can have **no other records**. If www had both a CNAME and its own MX, a mail server couldn't know which one to trust.
  - So a CNAME **can't sit at the apex**, because the apex must hold SOA and NS. You can CNAME `www` to `example.com`, but not `example.com` to anything. The same applies to any name that is itself a zone apex. Providers work around this with ALIAS/ANAME or "CNAME flattening," where the server resolves the target itself and returns plain A records.
- **MX**: the mail server for the domain, with a priority (lower is preferred).
- **TXT**: free text, used for SPF, DKIM, and domain-ownership verification.
- **Glue**: look at `ns1.example.com` above. To reach example.com you need ns1's IP, but ns1's IP lives *inside* example.com, which is circular. To break the loop, the parent (.com) hands out ns1's A record along with the NS referral. That extra record is glue. It's only needed when a nameserver's name falls inside the zone it serves.

#### 5. Resolution: who does the walking

1. Your app asks the OS. The OS's **stub resolver** sends a *recursive* query ("give me the final answer") to a **recursive resolver**, such as your ISP's or 1.1.1.1.
2. The recursive resolver checks its cache. If the answer isn't there, it walks the tree *iteratively*. It starts at a root server, found via a built-in **root hints** file. The root refers it to .com, .com refers it (with glue) to example.com's nameservers, and those return the answer.
3. The resolver caches the answer and hands it back to your machine.

#### 6. Caching and TTL: why this scales

Every record carries a TTL. Resolvers cache both final answers and the referrals along the way, so most lookups never reach the root or TLD servers. Even "doesn't exist" answers are cached, using the SOA's negative TTL.

The cost is staleness. When you change a record, old answers linger in caches until their TTL expires. That's all "DNS propagation" means. Lower the TTL before planned changes.

#### 7. Transport

DNS mostly runs over UDP port 53, which is fast with no handshake. It falls back to TCP for large responses and for zone transfers between primary and secondary servers.

#### 8. See it yourself

- `dig +trace example.com` shows the root → TLD → authoritative walk, with NS referrals and glue.
- `dig example.com SOA` shows the zone's metadata.
- Run `dig example.com` twice and watch the TTL count down on the cached answer.
