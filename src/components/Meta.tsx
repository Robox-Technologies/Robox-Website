export default function Meta({ title }: { title: string }) {
    return (
        <>
            <meta charSet="utf-8" />
            <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
            <link
                rel="icon"
                type="image/png"
                href="@images/favicon.png"
                sizes="72x72"
            />

            <meta
                name="viewport"
                content="width=device-width, initial-scale=1"
            />
            <meta
                name="keywords"
                content="Robox, Ro/Box, robotics, Python, line following, line-following, Rise Project, low-cost robotics, cheap robotics kit, robotics kit, RCJA, RoboCup, RoboCupJunior, RoboCup Junior Australia, STEM kit, STEM"
            />
            <meta name="author" content="Ro/Box" />
            <meta
                name="copyright"
                content="All content copyright © 2025 Ro/Box"
            />
            <meta name="theme-color" content="#F8F8F8" />

            <meta property="twitter:card" content="summary_large_image" />
            <meta
                name="twitter:title"
                content="Ro/Box - Robotics for Everyone"
            />
            <meta
                name="twitter:description"
                content="Ro/Box is an innovative, low-cost robotics kit that aims to make STEM education accessible to everyone."
            />
            <meta name="twitter:image" content="@images/og-image.jpg" />

            <meta property="og:type" content="website" />
            <meta
                property="og:site_name"
                content="Ro/Box - Robotics for Everyone"
            />
            <meta
                property="og:description"
                content="Ro/Box is an innovative, low-cost robotics kit that aims to make STEM education accessible to everyone."
            />
            <meta property="og:image" content="@images/og-image.jpg" />
            <meta property="og:image:width" content="1789" />
            <meta property="og:image:height" content="1079" />
            <meta property="og:image:type" content="image/jpg" />
            <meta
                property="og:title"
                content="Ro/Box - Robotics for Everyone"
            />
            <title>{title}</title>
        </>
    )
}
