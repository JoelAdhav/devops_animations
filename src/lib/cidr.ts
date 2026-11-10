/** Host allocation for ordinary IPv4 subnets and standard AWS IPv4 subnets. */
export function hostRange(network: number, broadcast: number, prefix: number, aws: boolean) {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32 || (aws && (prefix < 16 || prefix > 28))) {
    return { usable: 0, first: null, last: null, valid: false }
  }
  const total = 2 ** (32 - prefix)
  const pointToPointOrHost = !aws && prefix >= 31
  return {
    usable: pointToPointOrHost ? total : total - (aws ? 5 : 2),
    first: pointToPointOrHost ? network : network + (aws ? 4 : 1),
    last: pointToPointOrHost ? broadcast : broadcast - 1,
    valid: true,
  }
}
