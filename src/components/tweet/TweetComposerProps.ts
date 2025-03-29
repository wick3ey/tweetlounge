
export interface TweetComposerProps {
  onTweetSubmit: (content: string, imageFile?: File) => Promise<void>;
  placeholder?: string;
}
