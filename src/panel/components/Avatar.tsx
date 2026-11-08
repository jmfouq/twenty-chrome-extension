import { useState } from 'react';

type AvatarProps = {
  label: string;
  imageUrl?: string | null;
  shape?: 'round' | 'square';
};

const AVATAR_COLORS = ['#5e90f2', '#e5823f', '#4bae7d', '#b65ad1', '#d1555a', '#3fa3b5'];

const getColor = (label: string) =>
  AVATAR_COLORS[[...label].reduce((sum, character) => sum + character.charCodeAt(0), 0) % AVATAR_COLORS.length];

export const Avatar = ({ label, imageUrl, shape = 'round' }: AvatarProps) => {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const showImage = Boolean(imageUrl) && failedImageUrl !== imageUrl;

  return (
    <span className={`avatar avatar-${shape}`} style={{ backgroundColor: showImage ? undefined : getColor(label) }}>
      {showImage ? (
        <img src={imageUrl ?? undefined} alt="" onError={() => setFailedImageUrl(imageUrl ?? null)} />
      ) : (
        label.trim().charAt(0).toUpperCase() || '?'
      )}
    </span>
  );
};
