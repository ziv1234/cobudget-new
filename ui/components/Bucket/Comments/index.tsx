import AddComment from './AddComment';
import Comment from './Comment';
import Log from './Log';
import Context, { useCommentContext } from '../../../contexts/comment';
import LoadMore from 'components/LoadMore';
import { FormattedMessage } from 'react-intl';
import Button from 'components/Button';

const Comments = ({ currentUser, bucket, router }) => {
  const context = useCommentContext({
    from: 0,
    limit: 1000, // The limit might be a problem
    order: 'desc',
    currentUser,
    bucket,
  });
  const { comments, setFrom, limit, total, loading } = context;

  if (!bucket) return null;

  const exportCommenters = () => {
    const commenters = comments
      .map((comment) => comment.roundMember.user)
      .reduce((acc, cur) => {
        if (acc.hasOwnProperty(cur.id))
          // Get only unique users who commented
          return acc;
        else return { ...acc, [cur.id]: cur };
      }, []);
    console.log('FLAG __ index[28]', commenters);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Name,Email,Phone Number\n' +
      Object.values(commenters)
        .map(
          (commenter: any) =>
            `${commenter.name},${commenter.email},${commenter.phoneNumber}`
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'users_commented_on_my_dream.csv');
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="bg-white border-b-default">
      <div className="page grid gap-10 grid-cols-1 md:grid-cols-sidebar">
        <div>
          <Context.Provider value={context}>
            {(comments.length > 0 || currentUser?.currentCollMember) && (
              <>
                <div className="flex justify-between items-center">
                  {!!total && (
                    <h2 className="font-medium text-gray-600" id="comments">
                      <FormattedMessage
                        defaultMessage="{length} of {total} {total, plural, one {comment} other {comments}}"
                        values={{
                          total,
                          length: comments.length,
                        }}
                      />
                    </h2>
                  )}

                  {currentUser.currentCollMember.isAdmin && (
                    <Button variant="primary" onClick={exportCommenters}>
                      <FormattedMessage defaultMessage="Export" />
                    </Button>
                  )}
                  {bucket?.discourseTopicUrl && (
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={bucket.discourseTopicUrl}
                    >
                      <FormattedMessage defaultMessage="View on Discourse" />
                    </a>
                  )}
                </div>
                <LoadMore
                  autoLoadMore={false}
                  moreExist={total > comments.length}
                  loading={loading}
                  reverse
                  onClick={() => setFrom((f) => f + limit)}
                />
              </>
            )}
            {comments.map((comment, index) => {
              if (comment._type === 'LOG')
                return <Log log={comment} key={index} />;
              return (
                <Comment
                  comment={comment}
                  showBorderBottom={Boolean(index + 1 !== comments.length)}
                  key={comment.id}
                />
              );
            })}
            {currentUser?.currentCollMember?.isApproved && <AddComment />}
          </Context.Provider>
        </div>
      </div>
    </div>
  );
};

export default Comments;
