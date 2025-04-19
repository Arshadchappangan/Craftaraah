
async function payNow(amount) {
    const res = await fetch('/razorpayOrder', {
        method : 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
    });
    const data = await res.json();

    if (!res.ok || data.error) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: data.error[0] || 'Payment initiation failed.'
    });
    return;
}

    const options = {
        key : data.key,
        amount : data.amount,
        currency : "INR",
        name : "Craftaraah Ecommerce",
        description : "Order Payment",
        order_id : data.orderId,
        handler : function(response){
            console.log("Payment response:", response);
            fetch('/verifyPayment', {
                method : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    paymentId: response.razorpay_payment_id,
                    razorOrderId: response.razorpay_order_id,
                    signature: response.razorpay_signature
                })
            }).then(res => {
                return res.json()
            })
            .then(data => {
                if(data.status){
                    fetch('/placeOrder',{
                        method : 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            razorOrderId : response.razorpay_order_id,
                            paymentId : response.razorpay_payment_id,
                            signature : response.razorpay_signature,
                            paymentMethod : 'Razorpay',
                            selectedAddress : document.querySelector('input[name="selectedAddress"]:checked').value
                        })
                    }).then(res => res.json())
                    .then(data => {
                        if(data.success){
                            Swal.fire({
                                icon: 'success',
                                title: 'Order Placed!',
                                text: 'Redirecting to success page...',
                                timer: 1500,
                                showConfirmButton: false
                            }).then(() => {
                                window.location.href = '/orderPlaced';
                            });
                        } else {
                            window.location.href = '/orderFailure';
                        }
                    })
                    
                } else {
                    window.location.href = '/orderFailure';
                }
            }).catch(err => {
                console.error("Error verifying payment:", err);
                window.location.href = "/orderFailure";
            });
        },
        theme : {
            color : "#F37254"
        }
    }
    const razor = new Razorpay(options);
    razor.open();
}