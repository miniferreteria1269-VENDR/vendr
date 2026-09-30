export const toCurrencyCents = value => {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Math.round(
    (numericValue + Number.EPSILON) * 100
  );
};

export const calculateChange = (
  total,
  cashReceived
) => {
  const totalCents = toCurrencyCents(total);
  const receivedCents =
    toCurrencyCents(cashReceived);

  if (
    totalCents === null ||
    receivedCents === null ||
    totalCents < 0 ||
    receivedCents < 0
  ) {
    return {
      isValid: false,
      isEnough: false,
      changeCents: 0,
      amountDueCents:
        totalCents === null
          ? 0
          : Math.max(totalCents, 0)
    };
  }

  return {
    isValid: true,
    isEnough:
      receivedCents >= totalCents,
    changeCents: Math.max(
      receivedCents - totalCents,
      0
    ),
    amountDueCents: Math.max(
      totalCents - receivedCents,
      0
    )
  };
};
