export const formatter = (date) => {
  return `${new Date(date).toLocaleTimeString().slice(0, 5)} ${new Date(
    date
  ).toLocaleDateString()}`;
};
