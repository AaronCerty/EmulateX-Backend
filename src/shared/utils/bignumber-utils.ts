import BigNumber from 'bignumber.js';

BigNumber.DEBUG = true;
BigNumber.config({
  DECIMAL_PLACES: 6,
});

export const divideByDecimal6 = (value: string | number) => {
  const bigNumberValue = new BigNumber(value);
  return bigNumberValue.dividedBy(1000000).toNumber();
};

export const addDecimal6 = (value: string | number) => {
  const bigNumberValue = new BigNumber(value);
  return bigNumberValue.multipliedBy(1000000).toFixed(0);
};
