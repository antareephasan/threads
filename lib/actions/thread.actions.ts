"use server"

import Thread from "../models/thread.model";
import User from "../models/user.model";
import { connectToDB } from "../mongoose";
import { revalidatePath } from 'next/cache';


interface Params {
    text: string,
    author: string,
    communityId: string | null,
    path: string,
}
export async function createThread({
    text, author, communityId, path
}: Params) {
    try {
        connectToDB();
        const createdThread = await Thread.create({
            text,
            author,
            community: null,
        });

        // update  user model
        await User.findByIdAndUpdate(author, {
            $push: { threads: createdThread._id }
        })

        revalidatePath(path);
    } catch (error: any) {
        throw new Error(`Error creating thread: ${error.message}`)
    }
}

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
    try {
        connectToDB();

        // Calculate the number of posts to skip depending on the page we are on
        const skipAmount = (pageNumber - 1) * pageSize;

        // Fetch the posts that have no parents (top-level-threads...)
        const postsQuery = Thread.find({ parentId: { $in: [null, undefined] } })
            .sort({ createdAt: 'desc' })
            .skip(skipAmount)
            .limit(pageSize)
            .populate({ path: 'author', model: User })
            .populate({
                path: 'children',
                populate: {
                    path: 'author',
                    model: User,
                    select: "_id name parentId image"
                }
            })

        const totalPostsCount = await Thread.countDocuments({ parentId: { $in: [null, undefined] } });

        const posts = await postsQuery.exec();

        const isNext = totalPostsCount > skipAmount + posts.length;

        return { posts, isNext };
    } catch (error: any) {
        throw new Error(`Error fetching posts: ${error.message}`)
    }
}

export async function fetchThreadById(id: string) {
    try {
        connectToDB();
        // TODO: Populate Community
        const thread = await Thread.findById(id)
            .populate({
                path: 'author',
                model: User,
                select: "_id id name image"
            })
            .populate({
                path: 'children',
                populate: [
                    {
                        path: 'author',
                        model: User,
                        select: "_id id name parentId image"
                    },
                    {
                        path: 'children',
                        model: Thread,
                        populate: {
                            path: 'author',
                            model: User,
                            select: "_id id name parentId image"
                        }
                    }
                ]
            }).exec();

        return thread;
    } catch (error: any) {
        throw new Error(`Error fetching thread: ${error.message}`)
    }
}

export async function addCommentToThread(
    threadId: string,
    commentText: string,
    userId: string,
    path: string,
) {

    try {
        connectToDB();
        // Find the original thread by id
        const originalThread = await Thread.findById(threadId);
        if (!originalThread) {
            throw new Error("Thread not found");
        }

        // Create a new thread with the comment text
        const commentThread = new Thread({
            text: commentText,
            author: userId,
            parentId: threadId,
        })

        // Savethe comment thread in database
        const savedCommentThread = await commentThread.save();

        // Update original thread to include new comment
        originalThread.children.push(savedCommentThread._id);

        // Save original thread
        await originalThread.save();

        revalidatePath(path);
    } catch (error: any) {
        throw new Error(`Error adding comment: ${error.message}`)
    }
}

export async function fetchUserPosts(userId: string) {

    try {
        connectToDB()

        // TODO: Populate Community
        const threads = await User.findOne({ id: userId })
            .populate({
                path: 'threads',
                model: Thread,
                populate: {
                    path: 'children',
                    model: Thread,
                    populate: {
                        path: 'author',
                        model: User,
                        select: 'name image id'
                    }
                }
            })

            return threads;

    } catch (error: any) {
        throw new Error(`Error fetching user posts: ${error.message}`);
    }
}