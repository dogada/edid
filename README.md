# Human and url friendly (e)xtensible (d)istributed (id)s

Generate unique ids based on current UTC time in milliseconds, shard number and
loopback counter. Shard number can be automatically calculated from a parent of
the object (owner id, scope, blog id). It allows to group objects related to
same parent in same shard.

Parts of id are encoded using Bitcoin's variant of base58. It's both human and
url friendly. Bitcoin variant of base58 is chosen because encoded numbers can
be properly sorted. It's guaranteed that if A > B then base58(A) >
base58(B) for string of same length. It's not true for Flickr's variant of
base58 or base64 and base62.

Time in milliseconds passed since 1970 year (Javascripts's Date.now()) is stored
in first 8 chars, loopback counter -- next 2 chars, shard number -- last 3
chars. This scheme allows to gurantee proper sorting of ids by time for next
4000 years (I think humanity will destroy itself early but let's hope). 3 chars
used for encoding shard number allows to spread ids across 195112 (58^3)
logical shards (if you blog will need more shards, please ping me and you will
receive new reader).

This id generator is designed to simplify database partitioning that doesn't
play well with autoincrement id fields typical for databases. There are several
alternatives like well-known MongoDB's ObjectId but our approach allows to load
object by id from correct shard immediately because we keep logical shard
number inside id. It results in faster requests and better query isolation.
Generated ids are increased monotonically that results in less fragmentation of
index comparing with hash-based ids or random UUIDs. For time part is used less
than 48 bits to allow safe usage with Javascript's numbers (52 bits only are
allowed for mantissa).

Our approach have a lot in common with [Sharding & IDs at
Instagram](http://instagram-engineering.tumblr.com/post/10853187575/sharding-ids-at-instagram)
but date range for our ids isn't limited to 41 years. In default setup our ids
can be represented as 64-bits integers during 146 years. However our main
advantage is extensibility. After 41 years Instagram's numeric ids will stop to
work and you will need to migrate to new format, but our string ids will
continue to work even when 146 years have elapsed (new ids will not fit into
64-bit data range however).

Instagram's IDs are generated on database level using PostgreSQL server functions to maintain generators state. EDID can generate IDs on client or app server as well.

Copyright (C) 2015 Dmytro V. Dogadailo

This program is free software; you can redistribute it and/or modify it under
the terms of the MIT License.
