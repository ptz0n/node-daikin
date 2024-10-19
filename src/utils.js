export const truncateMiddle = (string, maxLength = 13) => {
  return string.length <= maxLength
    ? string
    : `${string.substring(0, Math.ceil((maxLength - 3) / 2))}...${string.substring(string.length - Math.floor((maxLength - 3) / 2))}`;
}
