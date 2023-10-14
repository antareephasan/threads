import { fetchUser, fetchUsers, getActivity } from '@/lib/actions/user.actions';
import { currentUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';


const Page = async () => {
  const user = await currentUser();

  // CHECKING IF USE EXISTS AND COMPLETED ONBOARDING  
  if (!user) return null;
  const userInfo = await fetchUser(user.id);
  if (!userInfo.onboarded) redirect('/onboarding');


  // getAcitivity

  const activities = await getActivity(userInfo._id);


    return (
      <section>
          <div className="head-text mb-10">Activity</div>

          <section className='m-10 flex flex-col gap-5'> 
            {activities.length > 0 ? (
              <>
                {activities.map((activity) => (
                  <Link 
                    key={activity._id}
                    href={`/thread/${activity.parentId}`}
                  >
                    <article className='activity-card'>
                      <Image
                        src={activity.author.image}
                        alt="Profile Picture"
                        width={20}
                        height={20}
                        className='rounded-full object-cover'
                      />

                      <p className='!text-small-regular text-light-1'>
                        <span className='mr-1 text-primary-500'>
                          {activity.author.name}
                        </span>{ " " }
                        replied to your thread
                      </p>
                    </article>
                  </Link>
                ))}
              </>
            ) : (
              <p className='!text-base-regular text-light-3'>No Activity yet</p>
            )}
          </section>
      </section>
    )
  }
  
  export default Page