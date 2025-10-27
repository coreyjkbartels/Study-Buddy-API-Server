import {Schema, model} from 'mongoose'

const friendRequestSchema = new Schema({
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiver: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    isAccepted: {
        type: Boolean,
        required: false,
        default: false,
    }
});


friendRequestSchema.statics.findByUser = async (user) => {
    const incomingRequests = await FriendRequest.find({ receiver: user._id }).exec();

    const outgoingRequests = await FriendRequest.find({ sender: user._id }).exec();

    const friendRequests = {
        "incoming": incomingRequests,
        "outgoing": outgoingRequests,
    };

    return friendRequests;
};

const FriendRequest = model('FriendRequest', friendRequestSchema);

export default FriendRequest;